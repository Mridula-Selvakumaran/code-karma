import * as vscode from 'vscode';
import * as https from 'https';
import * as os from 'os';

// Rank thresholds
const RANKS = [
    { min: 1200, label: 'Code Deity',         icon: '👑' },
    { min: 800,  label: 'Code Guru',          icon: '🧘‍♂️' },
    { min: 500,  label: 'Architecture Sage',  icon: '🏛️' },
    { min: 300,  label: 'Refactor Champion',  icon: '🏆' },
    { min: 150,  label: 'Debug Knight',       icon: '🛡️' },
    { min: 50,   label: 'Syntax Squire',      icon: '⚔️' },
    { min: 0,    label: 'Code Wanderer',      icon: '🌿' },
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
    
    // New Advanced Features State
    private username: string = '';
    private lastSyncedKarma: number = 0;
    private fileCooldowns: Map<string, number> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        // Load persisted state
        this.currentKarma = this.context.workspaceState.get<number>('codeKarma.score', 0);
        this.achievements = this.context.workspaceState.get<string[]>('codeKarma.achievements', []);
        this.lastSyncedKarma = this.context.globalState.get<number>('codeKarma.lastSyncedKarma', 0);
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

    public async init() {
        let storedUser = this.context.globalState.get<string>('codeKarma.username');
        if (!storedUser) {
            storedUser = await vscode.window.showInputBox({
                prompt: 'Choose a unique username for the global Code Karma leaderboard!',
                placeHolder: os.userInfo().username,
                ignoreFocusOut: true
            }) || os.userInfo().username;
            await this.context.globalState.update('codeKarma.username', storedUser);
        }
        this.username = storedUser;
    }

    public isOnCooldown(fileName: string): boolean {
        const cooldownMinutes = vscode.workspace.getConfiguration('codeKarma.rules').get<number>('cooldownMinutes', 3);
        const lastSaved = this.fileCooldowns.get(fileName) || 0;
        const now = Date.now();
        
        if (now - lastSaved < cooldownMinutes * 60 * 1000) {
            return true;
        }
        
        this.fileCooldowns.set(fileName, now);
        return false;
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

        const newRank = getRank(this.currentKarma).label;
        if (newRank !== previousRank && this.currentKarma > 0) {
            const { icon } = getRank(this.currentKarma);
            vscode.window.showInformationMessage(
                `🎉🎊 RANK UP! 🎊🎉 You have ascended to ${icon} ${newRank}! Your discipline is legendary.`,
                'Celebrate!'
            ).then(selection => {
                if (selection === 'Celebrate!') {
                    vscode.env.openExternal(vscode.Uri.parse(`http://localhost:5173/?celebrate=true&rank=${encodeURIComponent(newRank)}`));
                }
            });
            this.currentRank = newRank;
        }
    }

    public getCurrentKarma(): number {
        return this.currentKarma;
    }

    public notifyChanges() {
        if (this.currentKarma === this.lastSyncedKarma) {
            return; // No new points to sync
        }

        const score = this.currentKarma;
        const rank = getRank(this.currentKarma).label;
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${this.username}`;

        const payload = JSON.stringify({ username: this.username, score, rank, avatar });

        const options = {
            hostname: 'csdfojbgaorngheedngw.supabase.co',
            port: 443,
            path: '/rest/v1/leaderboard?on_conflict=username',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'sb_publishable_HwpvgnP_IN9-BSFVtvIp4w_e6p9ia-L',
                'Authorization': `Bearer sb_publishable_HwpvgnP_IN9-BSFVtvIp4w_e6p9ia-L`,
                'Prefer': 'resolution=merge-duplicates',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                // Successfully synced! Update local cache so we don't duplicate efforts
                this.lastSyncedKarma = score;
                this.context.globalState.update('codeKarma.lastSyncedKarma', score);
            }
        });

        req.on('error', (e) => {
            console.error('Failed to update Supabase, will retry on next save:', e.message);
        });

        req.write(payload);
        req.end();
    }
}
