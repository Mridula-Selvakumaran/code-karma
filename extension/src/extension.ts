import * as vscode from 'vscode';
import { RuleEngine } from './ruleEngine';
import { KarmaEngine } from './karmaEngine';

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Karma extension is now active!');

    const karmaEngine = new KarmaEngine(context);
    const ruleEngine = new RuleEngine(karmaEngine);

    // Command to show dashboard
    let disposable = vscode.commands.registerCommand('code-karma.showDashboard', () => {
        // We will open a webview or launch the external dashboard browser
        // For now, let's just show a message. In the future this can open the Vite dashboard URL
        vscode.window.showInformationMessage(`Your current Code Karma is: ${karmaEngine.getCurrentKarma()}`);
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
