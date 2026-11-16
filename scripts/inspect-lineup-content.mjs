import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

async function inspectImg() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chromePath, [
    '--remote-debugging-port=9224',
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=' + path.resolve('./.chrome-inspect-img'),
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9224/json/list');
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

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const img = document.querySelector('img');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Sample horizontal strips across the image height (each 5% high)
        const strips = [];
        const stripHeight = Math.floor(canvas.height / 20);
        for (let i = 0; i < 20; i++) {
          const y = i * stripHeight;
          const data = ctx.getImageData(0, y, canvas.width, stripHeight).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let p = 0; p < data.length; p += 32) {
            r += data[p];
            g += data[p+1];
            b += data[p+2];
            count++;
          }
          strips.push({
            strip: i,
            yPct: (i * 5) + '%',
            r: Math.round(r/count),
            g: Math.round(g/count),
            b: Math.round(b/count)
          });
        }

        return {
          width: img.naturalWidth,
          height: img.naturalHeight,
          strips
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Result:', JSON.stringify(evalRes.result.value, null, 2));
  proc.kill();
}
inspectImg().catch(console.error);
