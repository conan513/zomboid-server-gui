const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const apiRoutes = require('./routes/api');
const serverManager = require('./services/serverManager');
const { getSettings } = require('./config');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Serve client build if available
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// SPA Fallback Middleware (Express 5 compatible)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexHtml = path.join(clientDistPath, 'index.html');
  if (require('fs').existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(503).send(`
      <!DOCTYPE html>
      <html lang="hu">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Zomboid Server GUI</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0b0f19; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 540px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #f87171; margin-top: 0; font-size: 1.5rem; }
            p { color: #94a3b8; line-height: 1.6; }
            code { background: #0f172a; color: #38bdf8; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 0.95rem; }
            .cmd-box { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 12px; margin: 16px 0; text-align: left; overflow-x: auto; color: #4ade80; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Frontend nincs lefordítva</h1>
            <p>A backend szerver sikeresen fut, de a React frontend (<code>client/dist</code>) még nem lett lefordítva.</p>
            <p><strong>Megoldás:</strong> Állítsd le a szervert (Ctrl+C), majd futtasd a projekt gyökérkönyvtárában:</p>
            <div class="cmd-box">npm run build</div>
            <p>vagy indítsd közvetlenül a felkészített indítóscripttel:</p>
            <div class="cmd-box">./start.sh</div>
          </div>
        </body>
      </html>
    `);
  }
});

// WebSocket Connection
wss.on('connection', (ws) => {
  // Send current status
  ws.send(JSON.stringify({
    type: 'status',
    data: serverManager.getStatus()
  }));

  // Send initial log backlog
  const logs = serverManager.getLogs();
  ws.send(JSON.stringify({
    type: 'initial_logs',
    data: logs
  }));

  // Handle client messages (e.g. commands)
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'command' && parsed.command) {
        serverManager.sendCommand(parsed.command);
      }
    } catch (e) {
      console.error('WS parse error:', e);
    }
  });
});

// Broadcast serverManager events to all connected WebSocket clients
serverManager.on('log', (logEntry) => {
  const payload = JSON.stringify({ type: 'log', data: logEntry });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

serverManager.on('status', (status) => {
  const payload = JSON.stringify({ type: 'status', data: status });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

serverManager.on('players', (players) => {
  const payload = JSON.stringify({ type: 'players', data: players });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[PZ Server GUI] Backend Server running on http://localhost:${PORT}`);
});
