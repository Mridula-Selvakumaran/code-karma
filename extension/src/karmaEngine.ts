import * as vscode from 'vscode';

export class KarmaEngine {
    private currentKarma: number = 0;
    private achievements: string[] = [];

    constructor(private context: vscode.ExtensionContext) {
        // Load initial state from workspace state
        this.currentKarma = this.context.workspaceState.get<number>('codeKarma.score', 0);
        this.achievements = this.context.workspaceState.get<string[]>('codeKarma.achievements', []);
    }

    public addKarma(amount: number, reason: string) {
        this.currentKarma += amount;
        this.context.workspaceState.update('codeKarma.score', this.currentKarma);
        
        if (amount > 0) {
            vscode.window.showInformationMessage(`+${amount} Karma: ${reason}. Total: ${this.currentKarma}`);
        } else {
            vscode.window.showWarningMessage(`${amount} Karma: ${reason}. Total: ${this.currentKarma}`);
        }
    }

    public getCurrentKarma(): number {
        return this.currentKarma;
    }

    public notifyChanges() {
        // Here we could sync with backend later
    }
}
