import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function PremiumSuccess() {
  const navigate = useNavigate();
  const { refreshProfile, isPremium, loading } = useAuth();

  useEffect(() => {
    // Poll profile tot premium actief is (webhook kan even duren)
    const interval = setInterval(() => refreshProfile(), 3000);
    refreshProfile();
    return () => clearInterval(interval);
  }, [refreshProfile]);

  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
      {loading ? null : isPremium ? (
        <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Welkom bij Premium</h1>
          <p style={{ color: '#666', lineHeight: 1.6, marginBottom: 32 }}>
            Je hebt nu toegang tot alle verklaringen, preken en bijbelcommentaren.
          </p>
          <button className="premium-gate-btn" onClick={() => navigate('/zoeken')}>
            Begin met ontdekken
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Betaling wordt verwerkt</h1>
          <p style={{ color: '#666', lineHeight: 1.6 }}>
            Je betaling wordt bevestigd. Dit duurt meestal een paar seconden...
          </p>
        </>
      )}
    </div>
  );
}
