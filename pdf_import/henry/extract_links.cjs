const WebSocket = require('ws');

const PAGE_ID = 'AEC88B578E2F582E23D85182EDCFBC89';
const ws = new WebSocket(`ws://localhost:18800/devtools/page/${PAGE_ID}`);
let msgId = 1;

ws.on('open', () => {
  // Navigate to the Henry folder
  ws.send(JSON.stringify({
    id: msgId++,
    method: 'Page.navigate',
    params: { url: 'https://reformata.nl/#Theologie%2FVerklaringen%2FHenry%2C%20M.%20-%20Letterlijke%20en%20practicale%20verklaring%20van%20het%20Oude%20en%20Nieuwe%20Testament' }
  }));
  console.error('Navigating...');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.id === 1) {
    // Wait for page to load and JS to render
    console.error('Navigation started, waiting 5s for render...');
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: `(function() {
            const links = Array.from(document.querySelectorAll('a'));
            return links.map(a => ({ href: a.href, text: a.textContent.trim() })).filter(l => l.href.includes('.pdf') || l.href.includes('PDF') || l.text.includes('pdf') || l.text.includes('PDF'));
          })()`,
          returnByValue: true
        }
      }));
    }, 5000);
  } else if (msg.id === 2) {
    const result = msg.result;
    if (result && result.result && result.result.value) {
      const links = result.result.value;
      console.log(JSON.stringify(links, null, 2));
    } else {
      console.error('No PDF links found, getting all links...');
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: `(function() {
            const links = Array.from(document.querySelectorAll('a'));
            return {
              count: links.length,
              sample: links.slice(0, 20).map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 80) })),
              title: document.title,
              url: window.location.href,
              bodySnippet: document.body.innerText.substring(0, 1000)
            };
          })()`,
          returnByValue: true
        }
      }));
    }
    if (msg.id === 2 && result && result.result && result.result.value && Array.isArray(result.result.value)) {
      ws.close();
    }
  } else if (msg.id === 3) {
    console.log(JSON.stringify(msg.result, null, 2));
    ws.close();
  }
});

ws.on('error', (e) => { console.error('WS error:', e.message); });
ws.on('close', () => { console.error('WS closed'); });
