const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database('./karma.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            score INTEGER,
            rank TEXT,
            avatar TEXT
        )`);
        
        // Seed with some Dummy Data if empty
        db.get('SELECT count(*) as count FROM leaderboard', (err, row) => {
            if (row && row.count === 0) {
                const seedData = [
                    ['alice_dev', 420, 'Architecture Sage', 'https://api.dicebear.com/7.x/bottts/svg?seed=alice_dev'],
                    ['bob_coder', 315, 'Refactor Champion', 'https://api.dicebear.com/7.x/bottts/svg?seed=bob_coder'],
                    ['charlie_hacks', 40, 'Code Wanderer', 'https://api.dicebear.com/7.x/bottts/svg?seed=charlie_hacks'],
                    ['diana_debug', 850, 'Code Deity', 'https://api.dicebear.com/7.x/bottts/svg?seed=diana_debug']
                ];
                
                const stmt = db.prepare('INSERT INTO leaderboard (username, score, rank, avatar) VALUES (?, ?, ?, ?)');
                seedData.forEach(user => stmt.run(user));
                stmt.finalize();
            }
        });
    }
});

// Calculate rank based on score
function getRank(score) {
    if (score < 50) return 'Code Wanderer';
    if (score < 150) return 'Debug Knight';
    if (score < 400) return 'Refactor Champion';
    if (score < 800) return 'Architecture Sage';
    return 'Code Deity';
}

// Routes
app.get('/api/leaderboard', (req, res) => {
    db.all('SELECT * FROM leaderboard ORDER BY score DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            data: rows
        });
    });
});

app.post('/api/karma', (req, res) => {
    const { username, scoreDelta } = req.body;
    
    if (!username || scoreDelta === undefined) {
        return res.status(400).json({ error: 'Missing username or scoreDelta' });
    }

    // Find user
    db.get('SELECT score FROM leaderboard WHERE username = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let newScore = scoreDelta;
        
        if (row) {
            newScore = row.score + scoreDelta;
            const rank = getRank(newScore);
            db.run('UPDATE leaderboard SET score = ?, rank = ? WHERE username = ?', [newScore, rank, username], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ username, score: newScore, rank });
            });
        } else {
            const rank = getRank(newScore);
            const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
            db.run('INSERT INTO leaderboard (username, score, rank, avatar) VALUES (?, ?, ?, ?)', [username, newScore, rank, avatar], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ username, score: newScore, rank });
            });
        }
    });
});

app.listen(port, () => {
    console.log(`Code Karma Backend running on http://localhost:${port}`);
});
