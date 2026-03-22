import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import './index.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://csdfojbgaorngheedngw.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HwpvgnP_IN9-BSFVtvIp4w_e6p9ia-L';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const { width, height } = useWindowSize();
  
  // Check URL parameters for celebration
  const queryParams = new URLSearchParams(window.location.search);
  const isCelebrating = queryParams.get('celebrate') === 'true';
  const newRank = queryParams.get('rank') || '';
  const [showConfetti, setShowConfetti] = useState(isCelebrating);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Pseudo current user for demonstration
  const currentUser = {
    username: 'mksho',
    score: 182,
    rank: 'Debug Knight',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=mksho'
  };

  const mockData = [
    currentUser,
    { username: 'diana_debug', score: 1350, rank: 'Code Deity', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=diana_debug' },
    { username: 'eve_expert', score: 900, rank: 'Code Guru', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=eve_expert' },
    { username: 'alice_dev', score: 620, rank: 'Architecture Sage', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice_dev' },
    { username: 'bob_coder', score: 315, rank: 'Refactor Champion', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob_coder' },
    { username: 'charlie_hacks', score: 80, rank: 'Syntax Squire', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=charlie_hacks' },
    { username: 'dave_noob', score: 10, rank: 'Code Wanderer', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=dave_noob' },
  ];

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false });

      if (error || !data || data.length === 0) {
        setLeaderboard(mockData.sort((a, b) => b.score - a.score));
      } else {
        setLeaderboard(data);
      }
      setLoading(false);
    };

    fetchLeaderboard();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard' },
        (payload) => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="app-container">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      <header>
        <h1>Code Karma</h1>
        <p className="subtitle">Elevating Engineering Discipline</p>
        {showConfetti && <h2 style={{ color: '#f59e0b', margin: '1rem 0' }}>🎉 Congratulations on reaching {newRank}! 🎉</h2>}
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
              <span style={{ background: 'rgba(234, 67, 53, 0.12)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#EA4335' }}>🧙 Refactor Wizard</span>
              <span style={{ background: 'rgba(66, 133, 244, 0.12)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#4285F4' }}>🐛 Bug Hunter</span>
              <span style={{ background: 'rgba(251, 188, 5, 0.15)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#b58500' }}>🧹 Log Exorcist</span>
              <span style={{ background: 'rgba(52, 168, 83, 0.12)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#34A853' }}>🧠 Code Monk</span>
            </div>
            
            <h3 className="section-title" style={{ marginTop: '2rem' }}>Recent Events</h3>
            <ul style={{ listStyle: 'none', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><span style={{ color: '#34A853', fontWeight: 'bold' }}>+3</span> Featherweight Function</li>
                <li><span style={{ color: '#EA4335', fontWeight: 'bold' }}>-2</span> Console Log Panic</li>
                <li><span style={{ color: '#34A853', fontWeight: 'bold' }}>+4</span> Guard Clause Master</li>
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
