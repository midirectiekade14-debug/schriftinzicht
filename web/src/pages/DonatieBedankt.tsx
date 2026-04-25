import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useDocumentTitle from '../hooks/useDocumentTitle';

type Status = 'loading' | 'paid' | 'pending' | 'failed' | 'unknown';

export default function DonatieBedankt() {
  useDocumentTitle('Bedankt');
  const [params] = useSearchParams();
  const paymentId = params.get('id');
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!paymentId) { setStatus('unknown'); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('donation-status', {
          body: { paymentId },
        });
        if (cancelled) return;
        if (error || !data?.status) { setStatus('unknown'); return; }
        if (data.status === 'paid') setStatus('paid');
        else if (['open', 'pending', 'authorized'].includes(data.status)) setStatus('pending');
        else setStatus('failed');
      } catch {
        if (!cancelled) setStatus('unknown');
      }
    })();
    return () => { cancelled = true; };
  }, [paymentId]);

  return (
    <>
      <div className="screen-header">
        <h1>
          {status === 'paid' && 'Hartelijk dank!'}
          {status === 'pending' && 'Betaling in behandeling'}
          {status === 'failed' && 'Betaling niet voltooid'}
          {(status === 'loading' || status === 'unknown') && 'Bedankt'}
        </h1>
      </div>
      <div className="page doneren-bedankt">
        <section className="doneren-bedankt-body">
        {status === 'loading' && <p>Even geduld, we controleren uw betaling…</p>}

        {status === 'paid' && (
          <>
            <p>
              Uw donatie is ontvangen. We zijn u oprecht dankbaar — uw bijdrage helpt
              SchriftInzicht in stand te houden en uit te breiden.
            </p>
            <p className="doneren-bedankt-quote">
              <em>"Een iegelijk doe, gelijk hij in zijn hart voorneemt; niet uit droefheid,
              of uit nooddwang; want God heeft een blijmoedigen gever lief."</em><br />
              — 2 Korinthe 9:7
            </p>
          </>
        )}

        {status === 'pending' && (
          <p>
            We hebben uw betaling nog niet definitief binnen. Sommige betaalmethoden
            (bv. SEPA-overboeking) hebben enkele dagen nodig. U ontvangt geen bevestigingsmail —
            geen zorgen, alles loopt zoals het hoort.
          </p>
        )}

        {status === 'failed' && (
          <p>
            De betaling is geannuleerd of mislukt. U kunt het opnieuw proberen via de doneer-pagina.
          </p>
        )}

        {status === 'unknown' && (
          <p>
            We konden de status van uw betaling niet ophalen. Mocht u toch een bedrag
            zien afgeschreven, dan staat dat netjes in onze administratie.
          </p>
        )}

        <div className="doneren-bedankt-actions">
          <Link to="/zoeken" className="doneren-bedankt-cta">Terug naar de Schrift</Link>
          {status === 'failed' && (
            <Link to="/doneren" className="doneren-bedankt-cta secondary">Opnieuw proberen</Link>
          )}
        </div>
      </section>
      </div>
    </>
  );
}
