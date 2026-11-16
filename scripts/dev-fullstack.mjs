#!/usr/bin/env node

/**
 * YES ENTERPRISES — Full-Stack Concurrent Development Server Runner
 *
 * Runs both:
 * 1. Cloudflare Pages Functions Backend (Wrangler / Miniflare with D1 & R2) on 127.0.0.1:8788
 * 2. React Vite Frontend with HMR on 0.0.0.0:5173 (reverse-proxying /api and /uploads to 8788)
 *
 * Allows seamless local development on laptop (localhost:5173) and Android phone over Wi-Fi (192.168.x.x:5173).
 */

import { spawn } from 'node:child_process';
import os from 'node:os';

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

console.log('=================================================================');
console.log('YES ENTERPRISES — Local Full-Stack Development Environment');
console.log('Starting Cloudflare Pages Functions (D1/R2) + React Vite Frontend');
console.log('=================================================================\n');

// Detect local IPv4 network address for mobile access
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const localIps = getLocalIpAddresses();
const primaryLanIp = localIps.find(ip => ip.startsWith('192.168.')) || localIps[0] || '127.0.0.1';

// 1. Launch Cloudflare Pages Functions Backend on port 8788
console.log('[RUNNER] Spawning Cloudflare Pages Functions backend on 127.0.0.1:8788...');
const backendProc = spawn(npxCmd, ['wrangler', 'pages', 'dev', 'public', '--port', '8788', '--ip', '127.0.0.1'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: isWindows,
  env: {
    ...process.env,
    CI: 'true'
  }
});

let backendReady = false;

backendProc.stdout.on('data', (data) => {
  const line = data.toString();
  process.stdout.write(`\x1b[36m[BACKEND]\x1b[0m ${line}`);
  if (line.includes('Ready on') || line.includes('http://127.0.0.1:8788')) {
    if (!backendReady) {
      backendReady = true;
      startFrontend();
    }
  }
});

backendProc.stderr.on('data', (data) => {
  const line = data.toString();
  process.stderr.write(`\x1b[33m[BACKEND WARN]\x1b[0m ${line}`);
  if (line.includes('Ready on') || line.includes('http://127.0.0.1:8788')) {
    if (!backendReady) {
      backendReady = true;
      startFrontend();
    }
  }
});

let frontendProc = null;

function startFrontend() {
  console.log('\n[RUNNER] Backend is ready. Spawning Vite frontend on 0.0.0.0:5173...\n');
  frontendProc = spawn(npxCmd, ['vite', '--host', '0.0.0.0'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
    env: process.env
  });

  frontendProc.stdout.on('data', (data) => {
    process.stdout.write(`\x1b[32m[FRONTEND]\x1b[0m ${data.toString()}`);
  });

  frontendProc.stderr.on('data', (data) => {
    process.stderr.write(`\x1b[31m[FRONTEND ERR]\x1b[0m ${data.toString()}`);
  });

  frontendProc.on('exit', (code) => {
    console.log(`[RUNNER] Frontend process exited with code ${code}`);
    cleanup(code);
  });

  setTimeout(() => {
    console.log('\n=================================================================');
    console.log('✅ BOTH SERVICES ARE ACTIVE:');
    console.log('💻 Laptop / Local Browser : http://localhost:5173/');
    console.log(`📱 Android Mobile (Wi-Fi) : http://${primaryLanIp}:5173/`);
    console.log('⚙️  Local Functions API    : http://127.0.0.1:8788/api/health');
    console.log('📦 Local Catalogue API    : http://127.0.0.1:8788/api/products');
    console.log('=================================================================');
    console.log('Press Ctrl + C in this terminal to gracefully stop both services.\n');
  }, 1500);
}

// Graceful cleanup on termination
let cleaningUp = false;
function cleanup(exitCode = 0) {
  if (cleaningUp) return;
  cleaningUp = true;
  console.log('\n[RUNNER] Stopping development servers...');

  if (frontendProc) {
    try {
      frontendProc.kill('SIGINT');
      if (isWindows && frontendProc.pid) {
        spawn('taskkill', ['/pid', String(frontendProc.pid), '/f', '/t'], { stdio: 'ignore' });
      }
    } catch {}
  }

  if (backendProc) {
    try {
      backendProc.kill('SIGINT');
      if (isWindows && backendProc.pid) {
        spawn('taskkill', ['/pid', String(backendProc.pid), '/f', '/t'], { stdio: 'ignore' });
      }
    } catch {}
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 500);
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
process.on('exit', () => cleanup(0));
