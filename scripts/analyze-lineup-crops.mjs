import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

async function analyzeCrops() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chromePath, [
    '--remote-debugging-port=9225',
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=' + path.resolve('./.chrome-analyze-crops'),
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9225/json/list');
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

  // Let's inspect what text is on the image by checking contrast and edges across the top 35%
  const imgAnalysis = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const img = document.querySelector('img');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Detect high-contrast non-background clusters in the top 35% (embedded text)
        const topHeight = Math.floor(canvas.height * 0.35);
        const topData = ctx.getImageData(0, 0, canvas.width, topHeight).data;
        let textPixels = 0;
        for (let i = 0; i < topData.length; i += 4) {
          const r = topData[i], g = topData[i+1], b = topData[i+2];
          // Check for golden, yellow, or white text
          if ((r > 180 && g > 150 && b < 100) || (r > 220 && g > 220 && b > 220)) {
            textPixels++;
          }
        }

        // Detect where the products actually start vertically
        // Products have varying colors (bottles: pink, blue, steel, glass, red)
        let productStartY = 0;
        for (let y = 100; y < canvas.height; y += 10) {
          const rowData = ctx.getImageData(canvas.width * 0.2, y, canvas.width * 0.6, 5).data;
          let variance = 0;
          for (let p = 0; p < rowData.length; p += 16) {
            variance += Math.abs(rowData[p] - rowData[p+1]) + Math.abs(rowData[p+1] - rowData[p+2]);
          }
          if (variance / (rowData.length / 16) > 40) {
            productStartY = y;
            break;
          }
        }

        return {
          totalWidth: canvas.width,
          totalHeight: canvas.height,
          textPixelsTop: textPixels,
          productStartY
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Analysis:', imgAnalysis.result.value);
  proc.kill();
}
analyzeCrops().catch(console.error);
