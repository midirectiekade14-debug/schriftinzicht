export default function Instellingen() {
  return (
    <>
      <div className="screen-header">
        <h1>Instellingen</h1>
      </div>
      <div className="page">
        <div className="settings-section">
          <h3>Weergave</h3>
          <div className="setting-row">
            <span>Thema</span>
            <span className="setting-value">Donker (standaard)</span>
          </div>
          <div className="setting-row">
            <span>Lettergrootte</span>
            <span className="setting-value">Normaal</span>
          </div>
        </div>

        <div className="settings-section">
          <h3>Over SchriftInzicht</h3>
          <div className="setting-row">
            <span>Versie</span>
            <span className="setting-value">0.1.0</span>
          </div>
          <p className="about-text">
            SchriftInzicht brengt bijbelverklaringen van de oudvaders samen op
            één plek. Doorzoek verklaringen van Matthew Henry, de Statenvertaling
            met kanttekeningen, Dächsel en meer — gesorteerd per vers in een
            vergelijkende tijdlijn.
          </p>
        </div>

        <div className="settings-section">
          <h3>Bronnen</h3>
          <p className="source-text">
            &bull; Statenvertaling met Kanttekeningen<br />
            &bull; Matthew Henry — Bijbelverklaring (1706)<br />
            &bull; Dächsel — Bijbelverklaring<br />
            &bull; Heidelbergse Catechismus<br />
            &bull; Nederlandse Geloofsbelijdenis<br />
            &bull; Dordtse Leerregels
          </p>
          <p className="pd-note">Alle bronnen zijn publiek domein.</p>
        </div>

        <div className="settings-section">
          <h3>Contact</h3>
          <a href="mailto:info@schriftinzicht.nl" className="link">
            info@schriftinzicht.nl
          </a>
        </div>
      </div>
    </>
  );
}
