import * as vscode from 'vscode';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { KarmaEngine } from './karmaEngine';

export class RuleEngine {
    constructor(private karmaEngine: KarmaEngine) {}

    public analyzeDocument(document: vscode.TextDocument) {
        const text = document.getText();
        
        try {
            const ast = acorn.parse(text, { ecmaVersion: 2022, sourceType: 'module', locations: true });
            
            let consoleLogCount = 0;
            let largeFunctions = 0;
            let smallFunctions = 0;
            let earlyReturns = 0;
            let magicNumbersRestored = 0;
            let maxNestingDepth = 0;

            walk.simple(ast, {
                CallExpression(node: any) {
                    if (node.callee.type === 'MemberExpression' &&
                        node.callee.object.name === 'console' &&
                        node.callee.property.name === 'log') {
                        consoleLogCount++;
                    }
                },
                FunctionDeclaration(node: any) {
                    if (node.loc) {
                        const lines = node.loc.end.line - node.loc.start.line;
                        if (lines > 120) largeFunctions++;
                        else if (lines < 40 && lines > 3) smallFunctions++;
                    }
                },
                ArrowFunctionExpression(node: any) {
                    if (node.loc) {
                        const lines = node.loc.end.line - node.loc.start.line;
                        if (lines > 120) largeFunctions++;
                        else if (lines >= 4 && lines <= 40) smallFunctions++;
                    }
                },
                IfStatement(node: any) {
                    if (node.consequent.type === 'ReturnStatement' || 
                       (node.consequent.type === 'BlockStatement' && node.consequent.body[0]?.type === 'ReturnStatement')) {
                        earlyReturns++;
                    }
                },
                VariableDeclarator(node: any) {
                    if (node.id.type === 'Identifier' && node.id.name === node.id.name.toUpperCase()) {
                        if (node.init && (node.init.type === 'Literal' && typeof node.init.value === 'number')) {
                            magicNumbersRestored++;
                        }
                    }
                }
            });

            // We need a simple manual pass for nesting depth (pyramid of doom)
            let currentDepth = 0;
            for (let i = 0; i < text.length; i++) {
                if (text[i] === '{') {
                    currentDepth++;
                    if (currentDepth > maxNestingDepth) maxNestingDepth = currentDepth;
                } else if (text[i] === '}') {
                    currentDepth--;
                }
            }

            // For simplistic minimum viable tracking, we apply karma for found violations.
            // In a full implementation, we'd record previous state and only trigger on delta (diff).
            
            if (consoleLogCount > 0) {
                this.karmaEngine.addKarma(-2 * consoleLogCount, `Logging is not debugging. (-${2 * consoleLogCount} Karma)`);
            }
            if (largeFunctions > 0) {
                this.karmaEngine.addKarma(-12 * largeFunctions, `This function has grown sentient. (-${12 * largeFunctions} Karma)`);
            }
            if (smallFunctions > 0) {
                this.karmaEngine.addKarma(3 * smallFunctions, `Elegance achieved. Small functions, big brain. (+${3 * smallFunctions} Karma)`);
            }
            if (earlyReturns > 0) {
                 this.karmaEngine.addKarma(4 * earlyReturns, `You blocked complexity before it even spawned. (+${4 * earlyReturns} Karma)`);
            }
            if (magicNumbersRestored > 0) {
                 this.karmaEngine.addKarma(4 * magicNumbersRestored, `Numbers now have meaning. (+${4 * magicNumbersRestored} Karma)`);
            }
            if (maxNestingDepth > 4) {
                 this.karmaEngine.addKarma(-8, `Welcome to indentation hell. (-8 Karma)`);
            }
            
            // Regex Checks
            const todoMatch = text.match(/TODO:?|FIXME:?|HACK:?/g);
            if (todoMatch) {
                this.karmaEngine.addKarma(-1 * todoMatch.length, `Future you is filing complaints. (-${todoMatch.length} Karma)`);
            }

            const tokenRegex = /(eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+|sk_live_[a-zA-Z0-9]{24})/g;
            if (tokenRegex.test(text)) {
                 this.karmaEngine.addKarma(-25, 'Security Alert: Credentials exposed. (-25 Karma)');
            }

        } catch (e) {
            // Document might be in an invalid state while typing, ignore parse errors.
        }
    }
}
