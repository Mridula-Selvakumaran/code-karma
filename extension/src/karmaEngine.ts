import * as vscode from 'vscode';
import * as http from 'http';
import * as os from 'os';

// Rank thresholds (must match backend getRank())
const RANKS = [
    { min: 800, label: 'Code Deity',         icon: '👑' },
    { min: 400, label: 'Architecture Sage',  icon: '🏛️' },
    { min: 150, label: 'Refactor Champion',  icon: '🏆' },
    { min: 50,  label: 'Debug Knight',       icon: '🛡️' },
    { min: 0,   label: 'Code Wanderer',      icon: '🌿' },
];

function getRank(score: number): { label: string; icon: string } {
    return RANKS.find(r => score >= r.min) ?? RANKS[RANKS.length - 1];
}

export class KarmaEngine {
    private currentKarma: number = 0;
    private achievements: string[] = [];
    private pendingDelta: number = 0;
    private currentRank: string = '';
    private statusBarItem: vscode.StatusBarItem;

    constructor(private context: vscode.ExtensionContext) {
        // Load persisted state
        this.currentKarma = this.context.workspaceState.get<number>('codeKarma.score', 0);
        this.achievements = this.context.workspaceState.get<string[]>('codeKarma.achievements', []);
        this.currentRank = getRank(this.currentKarma).label;

        // Create status bar item (left-aligned, high priority)
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'code-karma.showDashboard';
        this.statusBarItem.tooltip = 'Click to open Code Karma Dashboard';
        this.updateStatusBar();
        this.statusBarItem.show();

        // Register it for cleanup on extension deactivate
        context.subscriptions.push(this.statusBarItem);
    }

    private updateStatusBar() {
        const { icon } = getRank(this.currentKarma);
        const rank = getRank(this.currentKarma).label;
        this.statusBarItem.text = `${icon} ${this.currentKarma} karma · ${rank}`;
    }

    public addKarma(amount: number, reason: string) {
        const previousRank = getRank(this.currentKarma).label;

        this.currentKarma += amount;
        this.pendingDelta += amount;
        this.context.workspaceState.update('codeKarma.score', this.currentKarma);

        // Update status bar immediately
        this.updateStatusBar();

        // Show toast notification
        if (amount > 0) {
            vscode.window.showInformationMessage(`+${amount} Karma: ${reason}. Total: ${this.currentKarma}`);
        } else {
            vscode.window.showWarningMessage(`${amount} Karma: ${reason}. Total: ${this.currentKarma}`);
        }

        // Check for rank-up
        const newRank = getRank(this.currentKarma).label;
        if (newRank !== previousRank && this.currentKarma > 0) {
            const { icon } = getRank(this.currentKarma);
            vscode.window.showInformationMessage(
                `🎉 Rank Up! You are now a ${icon} ${newRank}!`,
                'Open Dashboard'
            ).then(selection => {
                if (selection === 'Open Dashboard') {
                    vscode.env.openExternal(vscode.Uri.parse('http://localhost:5173'));
                }
            });
            this.currentRank = newRank;
        }
    }

    public getCurrentKarma(): number {
        return this.currentKarma;
    }

    public notifyChanges() {
        if (this.pendingDelta === 0) {
            return;
        }

        const username = os.userInfo().username;
        const scoreDelta = this.pendingDelta;
        this.pendingDelta = 0;

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

        const req = http.request(options, (_res) => {
            // Karma synced to backend successfully
        });

        req.on('error', () => {
            // Backend not running — fail silently, local state is still saved
        });

        req.write(payload);
        req.end();
    }
}
