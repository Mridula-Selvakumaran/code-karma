import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pseudo current user for demonstration
  const currentUser = {
    username: 'mksho',
    score: 182,
    rank: 'Refactor Champion',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=mksho'
  };

  useEffect(() => {
    // In a real app we would fetch from the backend
    // fetch('http://localhost:3000/api/leaderboard')
    //   .then(res => res.json())
    //   .then(data => { setLeaderboard(data.data); setLoading(false); })
    
    // For now we'll simulate the fetch to ensure UI displays immediately
    setTimeout(() => {
      setLeaderboard([
        currentUser,
        { username: 'diana_debug', score: 850, rank: 'Code Deity', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=diana_debug' },
        { username: 'alice_dev', score: 420, rank: 'Architecture Sage', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice_dev' },
        { username: 'bob_coder', score: 315, rank: 'Refactor Champion', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob_coder' },
        { username: 'charlie_hacks', score: 40, rank: 'Code Wanderer', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=charlie_hacks' },
      ].sort((a, b) => b.score - a.score));
      setLoading(false);
    }, 600);
  }, []);

  return (
    <div className="app-container">
      <header>
        <h1>Code Karma</h1>
        <p className="subtitle">Elevating Engineering Discipline</p>
      </header>

      <main className="dashboard-grid">
        {/* Left Column: Personal Stats */}
        <div className="glass-panel profile-section">
          <div className="avatar-container">
            <img src={currentUser.avatar} alt="Avatar" className="avatar" />
          </div>
          <h2>{currentUser.username}</h2>
          <div className="rank-badge">{currentUser.rank}</div>
          
          <div className="score-display">
            {currentUser.score}
          </div>
          <p className="subtitle">Total Karma</p>

          <div style={{ marginTop: '2rem', width: '100%', textAlign: 'left' }}>
            <h3 className="section-title">Achievements</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <span style={{ background: 'rgba(244, 63, 94, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#f43f5e' }}>🧙 Refactor Wizard</span>
              <span style={{ background: 'rgba(6, 182, 212, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#06b6d4' }}>🐛 Bug Hunter</span>
              <span style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#8b5cf6' }}>🧹 Log Exorcist</span>
              <span style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#10b981' }}>🧠 Code Monk</span>
            </div>
            
            <h3 className="section-title" style={{ marginTop: '2rem' }}>Recent Events</h3>
            <ul style={{ listStyle: 'none', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><span style={{ color: '#10b981', fontWeight: 'bold' }}>+3</span> Featherweight Function</li>
                <li><span style={{ color: '#f43f5e', fontWeight: 'bold' }}>-2</span> Console Log Panic</li>
                <li><span style={{ color: '#10b981', fontWeight: 'bold' }}>+4</span> Guard Clause Master</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Global Leaderboard */}
        <div className="glass-panel">
          <h2 className="section-title">Global Leaderboard</h2>
          <p className="subtitle">Top developers around the world</p>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--neon-primary)' }}>Loading ranks...</div>
          ) : (
            <ul className="leaderboard-list">
              {leaderboard.map((user, index) => (
                <li key={user.username} className={`leaderboard-item ${index === 0 ? 'top-1' : ''}`}>
                  <div className="user-info">
                    <div style={{ fontWeight: 'bold', color: index === 0 ? '#f59e0b' : 'var(--text-muted)', width: '20px' }}>
                      #{index + 1}
                    </div>
                    <img src={user.avatar} alt={user.username} className="user-avatar" />
                    <div className="user-details">
                      <h3>{user.username} {index === 0 && '👑'}</h3>
                      <p>{user.rank}</p>
                    </div>
                  </div>
                  <div className="user-score">{user.score}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
