import * as vscode from 'vscode';
import * as http from 'http';
import * as os from 'os';

export class KarmaEngine {
    private currentKarma: number = 0;
    private achievements: string[] = [];
    private pendingDelta: number = 0;

    constructor(private context: vscode.ExtensionContext) {
        // Load initial state from workspace state
        this.currentKarma = this.context.workspaceState.get<number>('codeKarma.score', 0);
        this.achievements = this.context.workspaceState.get<string[]>('codeKarma.achievements', []);
    }

    public addKarma(amount: number, reason: string) {
        this.currentKarma += amount;
        this.pendingDelta += amount;
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
        // Don't bother posting if nothing changed
        if (this.pendingDelta === 0) {
            return;
        }

        const username = os.userInfo().username;
        const scoreDelta = this.pendingDelta;
        this.pendingDelta = 0; // reset before async call to avoid double-posting

        const payload = JSON.stringify({ username, scoreDelta });

        const options: http.RequestOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/karma',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = http.request(options, (res) => {
            // Karma synced to backend successfully
        });

        req.on('error', () => {
            // Backend might not be running - fail silently, local state is still saved
        });

        req.write(payload);
        req.end();
    }
}
