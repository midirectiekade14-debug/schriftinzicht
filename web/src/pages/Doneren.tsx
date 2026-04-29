import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import useDocumentTitle from '../hooks/useDocumentTitle';

const PRESETS = [5, 10, 25, 50] as const;

// Cloudflare Turnstile site-key (security audit M-4 captcha). The widget is
// only rendered when this env var is set so signing up for Turnstile and
// flipping it on is a one-line config change. Without a key, the per-IP
// rate limit on the edge function is the only gate; with a key the
// captcha challenge runs first and donation-create verifies the token.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, opts: { sitekey: string; callback: (token: string) => void; 'error-callback'?: () => void }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export default function Doneren() {
  useDocumentTitle('Doneren');
  const [selected, setSelected] = useState<number | 'custom'>(10);
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Lazy-load Turnstile script + render widget when a site-key is configured.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    function render() {
      if (cancelled || !turnstileRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY!,
        callback: (token: string) => setCaptchaToken(token),
        'error-callback': () => setCaptchaToken(null),
      });
    }
    if (window.turnstile) { render(); return; }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', render);
    return () => {
      cancelled = true;
      script?.removeEventListener('load', render);
    };
  }, []);

  function activeAmount(): number {
    if (selected === 'custom') return parseFloat(custom.replace(',', '.')) || 0;
    return selected;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amount = activeAmount();
    if (amount < 1) { setError('Kies of vul een bedrag van minstens € 1 in.'); return; }
    if (amount > 5000) { setError('Voor donaties boven € 5.000 graag direct contact opnemen.'); return; }
    // When Turnstile is configured, require a token before submitting.
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Even geduld, de beveiligingscheck is nog bezig.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('donation-create', {
        body: {
          amount: amount.toFixed(2),
          name: name.trim() || null,
          message: message.trim() || null,
          captchaToken,
        },
      });
      if (fnError) throw fnError;
      if (!data?.checkoutUrl) throw new Error('Geen checkout-URL ontvangen.');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout';
      setError(`Kon betaling niet starten: ${msg}`);
      // Reset Turnstile so the user can try again with a fresh token.
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setCaptchaToken(null);
      }
      setLoading(false);
    }
  }

  return (
    <>
      <div className="screen-header">
        <h1>Steun SchriftInzicht</h1>
      </div>
      <div className="page doneren-page">
        <p className="doneren-lead">Help ons vier eeuwen bijbelverklaring inzichtelijk te maken</p>

        <section className="doneren-intro">
          <p>
            SchriftInzicht is een liefdewerk. Achter de website gaat veel onzichtbaar werk schuil:
            oude geschriften van puriteinen, oudvaders en kerkvaders worden gedigitaliseerd, ontleed
            en doorzoekbaar gemaakt — preken van Calvijn, kanttekeningen, catechismus-uitleg en
            klassieke bijbelverklaringen op één plek.
          </p>
          <p className="doneren-thanks">
            Een eenmalige bijdrage — groot of klein — helpt enorm.<br />
            Hartelijk dank voor uw betrokkenheid.
          </p>
        </section>

        <form className="doneren-form" onSubmit={handleSubmit}>
          <fieldset className="doneren-amounts">
            <legend>Kies een bedrag</legend>
            <div className="doneren-presets">
              {PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`doneren-preset${selected === amt ? ' active' : ''}`}
                  onClick={() => setSelected(amt)}
                >
                  € {amt}
                </button>
              ))}
              <button
                type="button"
                className={`doneren-preset doneren-preset-custom${selected === 'custom' ? ' active' : ''}`}
                onClick={() => setSelected('custom')}
              >
                Eigen bedrag
              </button>
            </div>
            {selected === 'custom' && (
              <div className="doneren-custom-wrap">
                <span className="doneren-currency">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="doneren-custom-input"
                  autoFocus
                />
              </div>
            )}
          </fieldset>

          <label className="doneren-field">
            <span>Naam <span className="doneren-optional">(optioneel)</span></span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anoniem"
              maxLength={80}
            />
          </label>

          <label className="doneren-field">
            <span>Bericht <span className="doneren-optional">(optioneel)</span></span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Een wens, gedachte of opmerking…"
              rows={3}
              maxLength={500}
            />
          </label>

          {error && <div className="doneren-error" role="alert">{error}</div>}

          {TURNSTILE_SITE_KEY && (
            <div ref={turnstileRef} className="doneren-turnstile" />
          )}

          <button type="submit" className="doneren-submit" disabled={loading || activeAmount() < 1 || (!!TURNSTILE_SITE_KEY && !captchaToken)}>
            {loading
              ? 'Bezig…'
              : `Doneer € ${activeAmount().toFixed(2).replace('.', ',')} aan SchriftInzicht`}
          </button>

          <p className="doneren-secure">
            Betaling loopt veilig via Mollie Payments.
          </p>
        </form>
      </div>
    </>
  );
}
