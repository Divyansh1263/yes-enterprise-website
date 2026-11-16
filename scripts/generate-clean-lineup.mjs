import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

async function generateCleanLineup() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chromePath, [
    '--remote-debugging-port=9227',
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=' + path.resolve('./.chrome-clean-lineup'),
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9227/json/list');
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

  const cleanDataUrl = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const img = document.querySelector('img');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        // Draw original
        ctx.drawImage(img, 0, 0);

        // Find exact bounding box of tallest bottle cap in center
        // Center bottles start around y=215
        // Top banner text is between y=50 and y=190
        // We fill y=0 to y=205 with matching background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 215);
        bgGrad.addColorStop(0, '#09365E');
        bgGrad.addColorStop(0.3, '#062E52');
        bgGrad.addColorStop(0.7, '#032545');
        bgGrad.addColorStop(1, '#021F3C');

        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, 212);

        // Subtle gradient blend transition between y=200 and y=220
        const blendGrad = ctx.createLinearGradient(0, 200, 0, 220);
        blendGrad.addColorStop(0, 'rgba(2, 31, 60, 0.95)');
        blendGrad.addColorStop(1, 'rgba(2, 31, 60, 0.0)');
        ctx.fillStyle = blendGrad;
        ctx.fillRect(0, 200, canvas.width, 20);

        return canvas.toDataURL('image/png');
      })()
    `,
    returnByValue: true
  });

  const base64Data = cleanDataUrl.result.value.replace(/^data:image\/png;base64,/, '');
  const buf = Buffer.from(base64Data, 'base64');
  fs.writeFileSync('public/assets/premium-feeding-bottles-lineup-clean.png', buf);
  console.log('Successfully generated clean lineup image:', buf.length, 'bytes');

  proc.kill();
}
generateCleanLineup().catch(console.error);
