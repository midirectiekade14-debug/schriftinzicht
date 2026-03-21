import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Props {
  children: React.ReactNode;
  message?: string;
  feature?: string;
}

export default function PremiumGate({ children, message, feature = 'Deze inhoud' }: Props) {
  const { isLoggedIn, isPremium, user, session, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;

  // Not logged in — show login prompt (existing behavior)
  if (!isLoggedIn) {
    return (
      <div className="premium-gate">
        <div className="premium-gate-icon">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="9" width="12" height="9" rx="2" />
            <path d="M7 9V6a3 3 0 0 1 6 0v3" />
          </svg>
        </div>
        <p>{feature} is beschikbaar na het aanmaken van een gratis account.</p>
        <Link to="/inloggen" className="premium-gate-btn">Inloggen of registreren</Link>
      </div>
    );
  }

  // Logged in and premium — show content
  if (isPremium) {
    return <>{children}</>;
  }

  // Logged in but not premium — show blur + upgrade CTA
  const createCheckout = async (planType: 'monthly' | 'yearly') => {
    if (!session) return;
    setCheckoutLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-mollie-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { userId: user?.id, planType },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data?.error) {
        setError(data.error);
      }
    } catch {
      setError('Er ging iets mis. Probeer het later opnieuw.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="premium-gate-wrapper">
      <div className="premium-gate-blur-container">
        {children}
        <div className="premium-gate-blur-overlay" />
      </div>

      <div className="premium-gate-cta">
        <button className="premium-gate-btn" onClick={() => setModalOpen(true)}>
          🔒 {message || feature} — Ontgrendelen
        </button>
      </div>

      {modalOpen && (
        <div className="premium-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="premium-modal" onClick={e => e.stopPropagation()}>
            <button className="premium-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            <div className="premium-modal-header">
              <div className="premium-modal-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
              <h2 className="premium-modal-title">SchriftInzicht Premium</h2>
              <p className="premium-modal-desc">
                {message || 'Ontgrendel alle verklaringen, preken en bijbelcommentaren van de oudvaders.'}
              </p>
            </div>

            {error && <p className="premium-modal-error">{error}</p>}

            <button
              className="premium-modal-btn-primary"
              onClick={() => createCheckout('yearly')}
              disabled={checkoutLoading}
            >
              Ontgrendel alles — €34,99/jaar
              <span className="premium-modal-btn-sub">Bespaar 42%</span>
            </button>

            <button
              className="premium-modal-btn-secondary"
              onClick={() => createCheckout('monthly')}
              disabled={checkoutLoading}
            >
              Maandelijks — €4,99/maand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
