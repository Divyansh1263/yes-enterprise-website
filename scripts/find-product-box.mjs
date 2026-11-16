import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

async function findProductBox() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chromePath, [
    '--remote-debugging-port=9226',
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=' + path.resolve('./.chrome-find-box'),
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9226/json/list');
  const list = await res.json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === curId) {
        ws.removeEventListener('message', handler);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:5175/assets/premium-feeding-bottles-lineup.png' });
  await new Promise(r => setTimeout(r, 1500));

  const box = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const img = document.querySelector('img');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Detect text vs background vs products
        // Let's render a clean crop or inspect top 200px vs 200-887px
        // Where is the text?
        // Let's generate a clean version:
        // In the top region (0 to 180px), there are headings like "PREMIUM FEEDING BOTTLES..."
        // The bottles themselves stand on the pedestal from y=160 to y=780.
        // What if we seamlessly feather/clean the top 160px with the deep navy background
        // or crop to y=150 to y=887?
        
        // Let's inspect rows 0 to 250
        const rows = [];
        for (let y = 0; y <= 250; y += 25) {
          const d = ctx.getImageData(canvas.width / 2 - 200, y, 400, 1).data;
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < d.length; i += 4) {
            r += d[i]; g += d[i+1]; b += d[i+2];
          }
          const cnt = d.length / 4;
          rows.push({ y, avgR: Math.round(r/cnt), avgG: Math.round(g/cnt), avgB: Math.round(b/cnt) });
        }
        return rows;
      })()
    `,
    returnByValue: true
  });

  console.log('Top rows:', box.result.value);
  proc.kill();
}
findProductBox().catch(console.error);
