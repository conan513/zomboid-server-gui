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

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(clientDistPath, 'index.html');
  if (require('fs').existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.send('Project Zomboid Dedicated Server GUI API is running. Build frontend or run Vite dev server.');
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
