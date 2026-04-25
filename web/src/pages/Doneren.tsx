import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import useDocumentTitle from '../hooks/useDocumentTitle';

const PRESETS = [5, 10, 25, 50] as const;

export default function Doneren() {
  useDocumentTitle('Doneren');
  const [selected, setSelected] = useState<number | 'custom'>(10);
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function activeAmount(): number {
    if (selected === 'custom') return parseFloat(custom.replace(',', '.')) || 0;
    return selected;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amount = activeAmount();
    if (amount < 1) { setError('Kies of vul een bedrag van minstens € 1 in.'); return; }
    if (amount > 5000) { setError('Voor donaties boven € 5.000 graag direct contact opnemen.'); return; }

    setError('');
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('donation-create', {
        body: {
          amount: amount.toFixed(2),
          name: name.trim() || null,
          message: message.trim() || null,
        },
      });
      if (fnError) throw fnError;
      if (!data?.checkoutUrl) throw new Error('Geen checkout-URL ontvangen.');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout';
      setError(`Kon betaling niet starten: ${msg}`);
      setLoading(false);
    }
  }

  return (
    <>
      <div className="screen-header">
        <h1>Steun SchriftInzicht</h1>
      </div>
      <div className="page doneren-page">
        <p className="doneren-lead">Help ons vier eeuwen bijbelverklaring beschikbaar te houden</p>

        <section className="doneren-intro">
          <p>
            SchriftInzicht is een liefdewerk. Achter de website gaat veel onzichtbaar werk schuil:
            oude geschriften van puriteinen, oudvaders en kerkvaders worden gedigitaliseerd, ontleed
            en doorzoekbaar gemaakt — preken van Calvijn, kanttekeningen, catechismus-uitleg en
            klassieke bijbelverklaringen op één plek.
          </p>
          <p>
            Het opzetten en onderhouden kost tijd, geduld en geld: serverkosten, database-opslag,
            OCR-pipelines en eindeloos uren correctiewerk. Geen abonnementen, geen advertenties.
            Wat hier staat moet vrij blijven voor iedereen die de Schrift wil onderzoeken.
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
              placeholder="Een gebed, gedachte of opmerking…"
              rows={3}
              maxLength={500}
            />
          </label>

          {error && <div className="doneren-error" role="alert">{error}</div>}

          <button type="submit" className="doneren-submit" disabled={loading || activeAmount() < 1}>
            {loading
              ? 'Bezig…'
              : `Doneer € ${activeAmount().toFixed(2).replace('.', ',')} via Mollie`}
          </button>

          <p className="doneren-secure">
            Betaling verloopt veilig via Mollie. Mogelijk: iDEAL, creditcard, Bancontact, PayPal en meer.
          </p>
        </form>
      </div>
    </>
  );
}
