import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Inloggen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Vul e-mail en wachtwoord in.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes('invalid login')) setError('Onjuist e-mailadres of wachtwoord.');
        else if (msg.includes('not confirmed')) setError('E-mailadres is nog niet bevestigd.');
        else if (msg.includes('rate')) setError('Te veel pogingen. Probeer het later opnieuw.');
        else setError(err.message);
      } else {
        navigate('/zoeken', { replace: true });
      }
    } else {
      const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already been registered')) setError('Dit e-mailadres is al in gebruik.');
        else if (msg.includes('password') && msg.includes('6')) setError('Wachtwoord moet minimaal 6 tekens bevatten.');
        else setError(err.message);
      } else {
        setSuccess('Account aangemaakt! Controleer je e-mail om te bevestigen.');
      }
    }
    setLoading(false);
  };

  const skip = () => navigate('/zoeken', { replace: true });

  return (
    <div className="auth">
      <div className="auth-content">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-cross">
            <div className="auth-cross-v" />
            <div className="auth-cross-h" />
          </div>
          <div className="auth-logo-rule" />
          <h1 className="auth-brand-main">SCHRIFT</h1>
          <h2 className="auth-brand-sub">INZICHT</h2>
        </div>

        <h3 className="auth-title">{mode === 'login' ? 'Welkom terug' : 'Account aanmaken'}</h3>
        <p className="auth-subtitle">Bewaar bladwijzers en zoekgeschiedenis</p>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
          >Inloggen</button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
          >Registreren</button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
          />
          <input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Even geduld...' : (mode === 'login' ? 'Inloggen' : 'Registreren')}
          </button>
        </form>

        <button className="auth-skip" onClick={skip}>Doorgaan zonder account</button>
      </div>
    </div>
  );
}
