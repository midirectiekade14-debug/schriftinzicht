const WebSocket = require('ws');

const pageId = '3AD1CE239699EC7F0E933C1DE852261C';
const ws = new WebSocket('ws://localhost:18800/devtools/page/' + pageId);
let msgId = 1;

ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({ id: msgId++, method: 'Page.enable' }));
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Page.navigate',
      params: { url: 'https://reformata.nl/#Theologie/Verklaringen/Calvijn' }
    }));
    console.log('Navigation sent');
  }, 500);
});

let evaluated = false;
ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.method === 'Page.loadEventFired' && !evaluated) {
    evaluated = true;
    console.log('Page loaded, waiting 5s for SPA render...');
    setTimeout(doEval, 5000);
  }

  if (msg.id === 99) {
    console.log('RESULT:' + msg.result.result.value);
    ws.close();
    process.exit(0);
  }
});

function doEval() {
  ws.send(JSON.stringify({
    id: 99,
    method: 'Runtime.evaluate',
    params: {
      expression: `(function() {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const pdfLinks = links
          .filter(a => a.href.toLowerCase().includes('.pdf'))
          .map(a => ({ href: a.href, text: a.textContent.trim() }));
        return JSON.stringify({ count: pdfLinks.length, links: pdfLinks });
      })()`
    }
  }));
}

ws.on('error', (e) => console.error('WS error:' + e.message));

// Fallback: also try after 15s regardless
setTimeout(() => {
  if (!evaluated) {
    evaluated = true;
    console.log('Fallback eval after 15s');
    doEval();
  }
}, 15000);

setTimeout(() => {
  console.log('Timeout reached, closing');
  ws.close();
  process.exit(0);
}, 35000);
