import * as vscode from 'vscode';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { KarmaEngine } from './karmaEngine';

export class RuleEngine {
    constructor(private karmaEngine: KarmaEngine) {}

    public analyzeDocument(document: vscode.TextDocument) {
        const text = document.getText();
        const fileName = document.fileName;

        // ---- Test file bonus: rewarded just for saving a test file ----
        if (/\.(test|spec)\.(js|ts|jsx|tsx)$/.test(fileName)) {
            this.karmaEngine.addKarma(15, 'You actually wrote tests. Legendary. (+15 Karma)');
            return; // Don't run other rules on test files
        }

        try {
            const ast = acorn.parse(text, { ecmaVersion: 2022, sourceType: 'module', locations: true });

            // ---- Counters ----
            let consoleLogCount = 0;
            let largeFunctions = 0;
            let smallFunctions = 0;
            let earlyReturns = 0;
            let magicNumbersRestored = 0;
            let maxNestingDepth = 0;

            // New positives
            let destructuringCount = 0;
            let defaultParamCount = 0;
            let ternaryCount = 0;
            let spreadCount = 0;

            // New negatives
            let looseEqualityCount = 0;
            let varDeclarationCount = 0;
            let emptyCatchCount = 0;
            let evalCount = 0;
            let singleLetterVarCount = 0;
            let innerHTMLCount = 0;

            // Single-letter variable exceptions (common loop vars / error param)
            const SINGLE_LETTER_OK = new Set(['i', 'j', 'k', 'x', 'y', 'z', 'e', '_', 'a', 'b']);

            walk.simple(ast, {
                // ---- Existing rules ----
                CallExpression(node: any) {
                    if (node.callee.type === 'MemberExpression' &&
                        node.callee.object.name === 'console' &&
                        node.callee.property.name === 'log') {
                        consoleLogCount++;
                    }
                    if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
                        evalCount++;
                    }
                },
                FunctionDeclaration(node: any) {
                    if (node.loc) {
                        const lines = node.loc.end.line - node.loc.start.line;
                        if (lines > 120) largeFunctions++;
                        else if (lines < 40 && lines > 3) smallFunctions++;
                    }
                    node.params.forEach((param: any) => {
                        if (param.type === 'AssignmentPattern') defaultParamCount++;
                        if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') destructuringCount++;
                    });
                },
                ArrowFunctionExpression(node: any) {
                    if (node.loc) {
                        const lines = node.loc.end.line - node.loc.start.line;
                        if (lines > 120) largeFunctions++;
                        else if (lines >= 4 && lines <= 40) smallFunctions++;
                    }
                    node.params.forEach((param: any) => {
                        if (param.type === 'AssignmentPattern') defaultParamCount++;
                        if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') destructuringCount++;
                    });
                },
                IfStatement(node: any) {
                    if (node.consequent.type === 'ReturnStatement' ||
                       (node.consequent.type === 'BlockStatement' && node.consequent.body[0]?.type === 'ReturnStatement')) {
                        earlyReturns++;
                    }
                },
                VariableDeclaration(node: any) {
                    if (node.kind === 'var') {
                        varDeclarationCount++;
                    }
                },
                VariableDeclarator(node: any) {
                    // Named constants replacing magic numbers
                    if (node.id.type === 'Identifier' && node.id.name === node.id.name.toUpperCase()) {
                        if (node.init && node.init.type === 'Literal' && typeof node.init.value === 'number') {
                            magicNumbersRestored++;
                        }
                    }
                    // Single-letter variable names
                    if (node.id.type === 'Identifier' &&
                        node.id.name.length === 1 &&
                        !SINGLE_LETTER_OK.has(node.id.name)) {
                        singleLetterVarCount++;
                    }
                    // Destructuring on the left side
                    if (node.id.type === 'ObjectPattern' || node.id.type === 'ArrayPattern') {
                        destructuringCount++;
                    }
                },
                BinaryExpression(node: any) {
                    if (node.operator === '==' || node.operator === '!=') {
                        looseEqualityCount++;
                    }
                },
                TryStatement(node: any) {
                    if (node.handler && node.handler.body.body.length === 0) {
                        emptyCatchCount++;
                    }
                },
                ConditionalExpression(_node: any) {
                    ternaryCount++;
                },
                SpreadElement(_node: any) {
                    spreadCount++;
                },
                AssignmentExpression(node: any) {
                    if (node.left.type === 'MemberExpression' &&
                        node.left.property.name === 'innerHTML') {
                        innerHTMLCount++;
                    }
                }
            });

            // Nesting depth manual pass (pyramid of doom)
            let currentDepth = 0;
            for (let i = 0; i < text.length; i++) {
                if (text[i] === '{') {
                    currentDepth++;
                    if (currentDepth > maxNestingDepth) maxNestingDepth = currentDepth;
                } else if (text[i] === '}') {
                    currentDepth--;
                }
            }

            // ================================================================
            // APPLY KARMA — Existing Rules
            // ================================================================
            const config = vscode.workspace.getConfiguration('codeKarma.rules');
            
            if (consoleLogCount > 0 && config.get<boolean>('enableConsoleLogPenalty', true)) {
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

            // Regex: TODOs / FIXMEs
            const todoMatch = text.match(/TODO:?|FIXME:?|HACK:?/g);
            if (todoMatch) {
                this.karmaEngine.addKarma(-1 * todoMatch.length, `Future you is filing complaints. (-${todoMatch.length} Karma)`);
            }

            // Regex: Exposed secrets
            const tokenRegex = /(eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+|sk_live_[a-zA-Z0-9]{24})/g;
            if (tokenRegex.test(text)) {
                this.karmaEngine.addKarma(-25, 'Security Alert: Credentials exposed. (-25 Karma)');
            }

            // ================================================================
            // APPLY KARMA — New Positive Rules
            // ================================================================
            if (destructuringCount > 0) {
                this.karmaEngine.addKarma(2 * destructuringCount, `Destructuring spotted. Clean and modern. (+${2 * destructuringCount} Karma)`);
            }
            if (defaultParamCount > 0) {
                this.karmaEngine.addKarma(2 * defaultParamCount, `Default params! Your functions are resilient. (+${2 * defaultParamCount} Karma)`);
            }
            if (ternaryCount > 0) {
                this.karmaEngine.addKarma(1 * ternaryCount, `Ternary operator. Concise and elegant. (+${ternaryCount} Karma)`);
            }
            if (spreadCount > 0) {
                this.karmaEngine.addKarma(1 * spreadCount, `Spread operator. Modern JS in the wild. (+${spreadCount} Karma)`);
            }

            // Regex: JSDoc comments
            if (config.get<boolean>('enableCommentRule', true)) {
                const jsdocMatches = text.match(/\/\*\*[\s\S]*?\*\//g);
                if (jsdocMatches) {
                    this.karmaEngine.addKarma(3 * jsdocMatches.length, `Documented code. Future devs thank you. (+${3 * jsdocMatches.length} Karma)`);
                }
            }

            // ================================================================
            // APPLY KARMA — New Negative Rules
            // ================================================================
            if (looseEqualityCount > 0) {
                this.karmaEngine.addKarma(-3 * looseEqualityCount, `== is a type coercion trap. Use ===. (-${3 * looseEqualityCount} Karma)`);
            }
            if (varDeclarationCount > 0) {
                this.karmaEngine.addKarma(-2 * varDeclarationCount, `var? Is this 2010? Use let or const. (-${2 * varDeclarationCount} Karma)`);
            }
            if (emptyCatchCount > 0) {
                this.karmaEngine.addKarma(-5 * emptyCatchCount, `Empty catch block. You're hiding your errors. (-${5 * emptyCatchCount} Karma)`);
            }
            if (evalCount > 0) {
                this.karmaEngine.addKarma(-15 * evalCount, `eval() is a security nightmare. (-${15 * evalCount} Karma)`);
            }
            if (singleLetterVarCount > 0) {
                this.karmaEngine.addKarma(-1 * singleLetterVarCount, `Single-letter variables. What does 'n' even mean? (-${singleLetterVarCount} Karma)`);
            }
            if (innerHTMLCount > 0) {
                this.karmaEngine.addKarma(-4 * innerHTMLCount, `innerHTML assignment. XSS risk! (-${4 * innerHTMLCount} Karma)`);
            }

            // Regex: debugger statements
            const debuggerMatches = text.match(/\bdebugger\b/g);
            if (debuggerMatches) {
                this.karmaEngine.addKarma(-10 * debuggerMatches.length, `You left a debugger in. For shame. (-${10 * debuggerMatches.length} Karma)`);
            }

            // Regex: hardcoded URLs
            const urlMatches = text.match(/['"`]https?:\/\/[^'"`\s]+['"`]/g);
            if (urlMatches) {
                this.karmaEngine.addKarma(-2 * urlMatches.length, `Hardcoded URLs belong in config, not source. (-${2 * urlMatches.length} Karma)`);
            }

        } catch (e) {
            // Document might be in an invalid state while typing — ignore parse errors
        }
    }
}
