const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const EventEmitter = require('events');
const treeKill = require('tree-kill');
const { getSettings, isWindows } = require('../config');

class ServerManager extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.status = 'stopped'; // 'stopped' | 'starting' | 'running' | 'stopping'
    this.logs = [];
    this.maxLogs = 1500;
    this.onlinePlayers = [];
    this.startTime = null;
  }

  getStatus() {
    return {
      status: this.status,
      pid: this.process ? this.process.pid : null,
      onlinePlayers: this.onlinePlayers,
      startTime: this.startTime,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      platform: process.platform
    };
  }

  getLogs() {
    return this.logs;
  }

  addLog(text, type = 'stdout') {
    if (!text) return;
    const lines = text.toString().split(/\r\n|\r|\n/);
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length === 0) continue;
      const logEntry = {
        id: Date.now() + Math.random().toString(36).substring(2, 7),
        time: new Date().toISOString(),
        text: cleanLine,
        type
      };
      this.logs.push(logEntry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      this.emit('log', logEntry);

      this.analyzeLogLine(cleanLine);
    }
  }

  analyzeLogLine(line) {
    // Detect server fully loaded
    if (line.includes('SERVER STARTED') || line.includes('Server started') || line.includes('Initialization [DONE]')) {
      this.status = 'running';
      this.emit('status', this.getStatus());
    }

    // Detect players joining / leaving
    const joinMatch = line.match(/(?:User|Player)\s+([A-Za-z0-9_\-]+)\s+(?:connected|has joined)/i);
    if (joinMatch) {
      const username = joinMatch[1];
      if (!this.onlinePlayers.includes(username)) {
        this.onlinePlayers.push(username);
        this.emit('players', this.onlinePlayers);
      }
    }

    const leaveMatch = line.match(/(?:User|Player)\s+([A-Za-z0-9_\-]+)\s+(?:disconnected|has left|fully disconnected)/i);
    if (leaveMatch) {
      const username = leaveMatch[1];
      this.onlinePlayers = this.onlinePlayers.filter(p => p !== username);
      this.emit('players', this.onlinePlayers);
    }

    // Detect player list output from "players" command
    if (line.includes('Players connected (')) {
      const pMatch = line.match(/Players connected \(\d+\):\s*(.*)/);
      if (pMatch && pMatch[1]) {
        const names = pMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        this.onlinePlayers = names;
        this.emit('players', this.onlinePlayers);
      }
    }
  }

  startServer(options = {}) {
    if (this.process || this.status === 'running' || this.status === 'starting') {
      throw new Error('Server is already running or starting!');
    }

    const settings = getSettings();
    const serverPath = options.serverInstallPath || settings.serverInstallPath;
    const serverName = options.serverName || settings.serverName || 'servertest';
    const adminPassword = options.adminPassword || settings.adminPassword || '';

    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server directory does not exist: ${serverPath}. Please install the server first.`);
    }

    const batPath = path.join(serverPath, 'StartServer64.bat');
    const shPath = path.join(serverPath, 'start-server.sh');
    const exePath = path.join(serverPath, 'ProjectZomboid64.exe');
    const binPath = path.join(serverPath, 'ProjectZomboid64');

    let executable;
    let spawnArgs = [];

    if (isWindows) {
      if (fs.existsSync(batPath)) {
        executable = 'cmd.exe';
        spawnArgs = ['/c', 'StartServer64.bat', '-servername', serverName];
        if (adminPassword) spawnArgs.push('-adminpassword', adminPassword);
      } else if (fs.existsSync(exePath)) {
        executable = exePath;
        spawnArgs = ['-servername', serverName];
        if (adminPassword) spawnArgs.push('-adminpassword', adminPassword);
      } else {
        throw new Error(`StartServer64.bat or ProjectZomboid64.exe not found in ${serverPath}`);
      }
    } else {
      // Linux / macOS
      if (fs.existsSync(shPath)) {
        try {
          fs.chmodSync(shPath, 0o755);
        } catch (e) {}
        executable = 'bash';
        spawnArgs = ['start-server.sh', '-servername', serverName];
        if (adminPassword) spawnArgs.push('-adminpassword', adminPassword);
      } else if (fs.existsSync(binPath)) {
        try {
          fs.chmodSync(binPath, 0o755);
        } catch (e) {}
        executable = binPath;
        spawnArgs = ['-servername', serverName];
        if (adminPassword) spawnArgs.push('-adminpassword', adminPassword);
      } else {
        throw new Error(`start-server.sh or ProjectZomboid64 not found in ${serverPath}`);
      }
    }

    this.status = 'starting';
    this.startTime = Date.now();
    this.onlinePlayers = [];
    this.emit('status', this.getStatus());
    this.addLog(`[Manager] Launching Project Zomboid Dedicated Server (${serverName}) on ${process.platform}...`, 'system');

    const env = { ...process.env };
    this.process = spawn(executable, spawnArgs, {
      cwd: serverPath,
      env,
      windowsHide: false
    });

    this.addLog(`[Manager] Process started with PID ${this.process.pid}`, 'system');

    this.process.stdout.on('data', (data) => {
      this.addLog(data.toString(), 'stdout');
    });

    this.process.stderr.on('data', (data) => {
      this.addLog(data.toString(), 'stderr');
    });

    this.process.on('close', (code) => {
      this.addLog(`[Manager] Server stopped with exit code ${code}`, 'system');
      this.process = null;
      this.status = 'stopped';
      this.startTime = null;
      this.onlinePlayers = [];
      this.emit('status', this.getStatus());
    });

    this.process.on('error', (err) => {
      this.addLog(`[Manager Error] ${err.message}`, 'error');
      this.process = null;
      this.status = 'stopped';
      this.startTime = null;
      this.emit('status', this.getStatus());
    });

    return this.getStatus();
  }

  sendCommand(cmd) {
    if (!this.process || !this.process.stdin) {
      throw new Error('Server process is not running.');
    }
    const cleanCmd = cmd.trim();
    this.addLog(`> ${cleanCmd}`, 'command');
    this.process.stdin.write(`${cleanCmd}\n`);
    return true;
  }

  stopServer(force = false) {
    if (!this.process) {
      this.status = 'stopped';
      this.emit('status', this.getStatus());
      return false;
    }

    this.status = 'stopping';
    this.emit('status', this.getStatus());
    this.addLog('[Manager] Stopping server (sending quit command)...', 'system');

    if (force) {
      if (this.process && this.process.pid) {
        treeKill(this.process.pid, 'SIGKILL', (err) => {
          if (err) console.error('Error killing process:', err);
          this.process = null;
          this.status = 'stopped';
          this.emit('status', this.getStatus());
        });
      }
      return true;
    }

    try {
      this.sendCommand('save');
      setTimeout(() => {
        if (this.process) {
          this.sendCommand('quit');
        }
      }, 1500);

      // Force kill after 15 seconds if still running
      setTimeout(() => {
        if (this.process) {
          this.addLog('[Manager] Server did not stop in time, forcing kill...', 'warning');
          if (this.process && this.process.pid) {
            treeKill(this.process.pid, 'SIGKILL', () => {});
          }
        }
      }, 15000);

      return true;
    } catch (e) {
      if (this.process && this.process.pid) {
        treeKill(this.process.pid, 'SIGKILL', () => {});
      }
      return false;
    }
  }

  restartServer() {
    this.addLog('[Manager] Restarting server...', 'system');
    this.stopServer();
    const checkInterval = setInterval(() => {
      if (this.status === 'stopped') {
        clearInterval(checkInterval);
        setTimeout(() => {
          try {
            this.startServer();
          } catch (e) {
            this.addLog(`[Manager Error] Restart failed: ${e.message}`, 'error');
          }
        }, 2000);
      }
    }, 1000);
  }
}

const serverManagerInstance = new ServerManager();
module.exports = serverManagerInstance;
