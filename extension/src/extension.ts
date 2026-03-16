import * as vscode from 'vscode';
import { RuleEngine } from './ruleEngine';
import { KarmaEngine } from './karmaEngine';

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Karma extension is now active!');

    const karmaEngine = new KarmaEngine(context);
    const ruleEngine = new RuleEngine(karmaEngine);

    // Command to show dashboard
    let disposable = vscode.commands.registerCommand('code-karma.showDashboard', () => {
        const dashboardUrl = vscode.Uri.parse('http://localhost:5173');
        vscode.env.openExternal(dashboardUrl);
        vscode.window.showInformationMessage(`Code Karma: ${karmaEngine.getCurrentKarma()} pts — opening dashboard...`);
    });

    context.subscriptions.push(disposable);

    // Listen to document saves
    vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId === 'javascript' || document.languageId === 'typescript') {
            ruleEngine.analyzeDocument(document);
            karmaEngine.notifyChanges();
        }
    });

    // We can also run an initial scan
    // ruleEngine.scanWorkspace();
}

export function deactivate() {}
