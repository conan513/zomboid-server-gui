const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');
const tar = require('tar');
const { spawn } = require('child_process');
const { getSettings, isWindows } = require('../config');

const STEAMCMD_URLS = {
  win32: 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip',
  linux: 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz',
  darwin: 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz'
};

let currentProcess = null;

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    fs.ensureDirSync(path.dirname(dest));
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, dest, onProgress).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      let lastReport = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        if (now - lastReport > 800) { // report every ~800ms
          lastReport = now;
          if (onProgress) {
            const mb = (downloadedBytes / (1024 * 1024)).toFixed(1);
            const totalMb = totalBytes ? (totalBytes / (1024 * 1024)).toFixed(1) : null;
            const pct = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : null;
            if (pct !== null) {
              onProgress(`[SteamCMD Download] ${mb} MB / ${totalMb} MB (${pct}%)...`);
            } else {
              onProgress(`[SteamCMD Download] ${mb} MB downloaded...`);
            }
          }
        }
      });

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function ensureSteamCmd(onLog) {
  const settings = getSettings();
  const steamCmdExe = settings.steamCmdPath;
  const steamCmdDir = path.dirname(steamCmdExe);
  const platform = process.platform === 'win32' ? 'win32' : (process.platform === 'darwin' ? 'darwin' : 'linux');

  if (fs.existsSync(steamCmdExe)) {
    if (!isWindows) {
      try {
        fs.chmodSync(steamCmdExe, 0o755);
      } catch (e) {}
    }
    if (onLog) onLog(`[SteamCMD] Found steamcmd executable at: ${steamCmdExe}\n`);
    return steamCmdExe;
  }

  const downloadUrl = STEAMCMD_URLS[platform] || STEAMCMD_URLS.linux;
  if (onLog) onLog(`[SteamCMD] steamcmd not found on system. Downloading for "${process.platform}" from ${downloadUrl}...\n`);
  fs.ensureDirSync(steamCmdDir);

  if (platform === 'win32') {
    const zipPath = path.join(steamCmdDir, 'steamcmd.zip');
    await downloadFile(downloadUrl, zipPath, onLog);
    if (onLog) onLog(`[SteamCMD] Download complete. Extracting ZIP archive to ${steamCmdDir}...\n`);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(steamCmdDir, true);
    fs.removeSync(zipPath);
  } else {
    // Linux / macOS (.tar.gz)
    const tarPath = path.join(steamCmdDir, 'steamcmd.tar.gz');
    await downloadFile(downloadUrl, tarPath, onLog);
    if (onLog) onLog(`[SteamCMD] Download complete. Extracting TAR.GZ archive to ${steamCmdDir}...\n`);

    await tar.x({
      file: tarPath,
      cwd: steamCmdDir
    });
    fs.removeSync(tarPath);

    // Make sure steamcmd.sh and internal linux binaries are executable
    if (fs.existsSync(steamCmdExe)) {
      fs.chmodSync(steamCmdExe, 0o755);
    }
    const linux32 = path.join(steamCmdDir, 'linux32');
    if (fs.existsSync(linux32)) {
      const files = fs.readdirSync(linux32);
      for (const f of files) {
        try {
          fs.chmodSync(path.join(linux32, f), 0o755);
        } catch (e) {}
      }
    }
  }

  if (fs.existsSync(steamCmdExe)) {
    if (!isWindows) {
      fs.chmodSync(steamCmdExe, 0o755);
    }
    if (onLog) onLog(`[SteamCMD] Successfully unpacked SteamCMD to ${steamCmdExe}\n`);
    return steamCmdExe;
  } else {
    throw new Error(`SteamCMD was extracted, but executable was not found at ${steamCmdExe}`);
  }
}

function installOrUpdateServer({ installPath, branch, betaPassword, validate = true }, onLog, onExit) {
  if (currentProcess) {
    throw new Error('A SteamCMD process is already running!');
  }

  const settings = getSettings();
  const targetPath = installPath || settings.serverInstallPath;
  fs.ensureDirSync(targetPath);

  if (onLog) onLog(`[SteamCMD] Initializing Project Zomboid Dedicated Server installer in "${targetPath}"...\n`);

  ensureSteamCmd(onLog).then((steamCmdExe) => {
    const args = [
      '+force_install_dir', targetPath,
      '+login', 'anonymous'
    ];

    if (branch && branch !== 'public') {
      if (betaPassword) {
        args.push('+app_update', '380870', '-beta', branch, '-betapassword', betaPassword);
      } else {
        args.push('+app_update', '380870', '-beta', branch);
      }
    } else {
      args.push('+app_update', '380870');
    }

    if (validate) {
      args.push('validate');
    }
    args.push('+quit');

    if (onLog) onLog(`[SteamCMD] Launching: "${steamCmdExe}" ${args.join(' ')}\n\n`);

    const child = spawn(steamCmdExe, args, {
      cwd: path.dirname(steamCmdExe),
      windowsHide: true,
      env: { ...process.env }
    });

    currentProcess = child;

    child.stdout.on('data', (data) => {
      if (onLog) onLog(data.toString());
    });

    child.stderr.on('data', (data) => {
      if (onLog) onLog(`[ERR] ${data.toString()}`);
    });

    child.on('close', (code) => {
      currentProcess = null;
      if (onLog) onLog(`\n[SteamCMD] Process finished with exit code ${code} (0 = Success)\n`);
      if (onExit) onExit(code);
    });

    child.on('error', (err) => {
      currentProcess = null;
      if (onLog) onLog(`\n[SteamCMD Error] ${err.message}\n`);
      if (onExit) onExit(1, err);
    });
  }).catch((err) => {
    if (onLog) onLog(`\n[SteamCMD Setup Error] ${err.message}\n`);
    if (onExit) onExit(1, err);
  });
}

function cancelSteamCmd() {
  if (currentProcess) {
    try {
      currentProcess.kill('SIGKILL');
      currentProcess = null;
      return true;
    } catch (e) {
      console.error('Failed to kill steamcmd process', e);
    }
  }
  return false;
}

function isSteamCmdRunning() {
  return currentProcess !== null;
}

function checkServerInstalled(installPath) {
  const target = installPath || getSettings().serverInstallPath;
  const batPath = path.join(target, 'StartServer64.bat');
  const shPath = path.join(target, 'start-server.sh');
  const exePath = path.join(target, 'ProjectZomboid64.exe');
  const binPath = path.join(target, 'ProjectZomboid64');
  const jarPath = path.join(target, 'projectzomboid.jar');

  const exists = fs.existsSync(batPath) || fs.existsSync(shPath) || fs.existsSync(exePath) || fs.existsSync(binPath) || fs.existsSync(jarPath);
  return {
    installed: exists,
    path: target,
    hasScript: isWindows ? fs.existsSync(batPath) : fs.existsSync(shPath),
    hasBinary: isWindows ? fs.existsSync(exePath) : fs.existsSync(binPath)
  };
}

module.exports = {
  ensureSteamCmd,
  installOrUpdateServer,
  cancelSteamCmd,
  isSteamCmdRunning,
  checkServerInstalled
};
