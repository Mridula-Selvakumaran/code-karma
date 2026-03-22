import * as vscode from 'vscode';
import { RuleEngine } from './ruleEngine';
import { PythonRuleEngine } from './pythonRuleEngine';
import { KarmaEngine } from './karmaEngine';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Code Karma extension is now active!');

    const karmaEngine = new KarmaEngine(context);
    await karmaEngine.init();
    const ruleEngine = new RuleEngine(karmaEngine);
    const pythonRuleEngine = new PythonRuleEngine(karmaEngine);

    // Command to show dashboard
    let disposable = vscode.commands.registerCommand('code-karma.showDashboard', () => {
        const dashboardUrl = vscode.Uri.parse('http://localhost:5173');
        vscode.env.openExternal(dashboardUrl);
        vscode.window.showInformationMessage(`Code Karma: ${karmaEngine.getCurrentKarma()} pts — opening dashboard...`);
    });

    context.subscriptions.push(disposable);

    // Listen to document saves — JS, TS, JSX, TSX, and Python
    vscode.workspace.onDidSaveTextDocument((document) => {
        if (karmaEngine.isOnCooldown(document.fileName)) {
            return; // Skip analysis if file was saved too recently
        }

        const lang = document.languageId;
        if (lang === 'javascript' || lang === 'typescript' ||
            lang === 'javascriptreact' || lang === 'typescriptreact') {
            ruleEngine.analyzeDocument(document);
            karmaEngine.notifyChanges();
        } else if (lang === 'python') {
            pythonRuleEngine.analyzeDocument(document);
            karmaEngine.notifyChanges();
        }
    });
}

export function deactivate() {}
