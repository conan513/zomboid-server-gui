const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { getSettings } = require('../config');

/**
 * Discovers all potential Workshop and Mod directories on the system.
 */
function getModSearchPaths() {
  const settings = getSettings();
  const searchPaths = new Set();
  const home = os.homedir();

  // 1. Server install directory workshop
  if (settings.serverInstallPath) {
    searchPaths.add(path.join(settings.serverInstallPath, 'steamapps', 'workshop', 'content', '108600'));
    searchPaths.add(path.join(settings.serverInstallPath, 'mods'));
  }

  // 2. User Zomboid data directory
  if (settings.zomboidUserDataPath) {
    searchPaths.add(path.join(settings.zomboidUserDataPath, 'mods'));
    searchPaths.add(path.join(settings.zomboidUserDataPath, 'workshop', 'content', '108600'));
  }

  // 3. SteamCMD directory
  const steamCmdDir = path.join(__dirname, '..', '..', 'steamcmd');
  searchPaths.add(path.join(steamCmdDir, 'steamapps', 'workshop', 'content', '108600'));

  // 4. Default Steam installation locations (Windows & Linux / SteamOS / Deck)
  const defaultSteamPaths = [
    'C:/Program Files (x86)/Steam/steamapps/workshop/content/108600',
    'C:/Program Files/Steam/steamapps/workshop/content/108600',
    'D:/SteamLibrary/steamapps/workshop/content/108600',
    'E:/SteamLibrary/steamapps/workshop/content/108600',
    'F:/SteamLibrary/steamapps/workshop/content/108600',
    path.join(home, '.steam', 'steam', 'steamapps', 'workshop', 'content', '108600'),
    path.join(home, '.steam', 'root', 'steamapps', 'workshop', 'content', '108600'),
    path.join(home, '.local', 'share', 'Steam', 'steamapps', 'workshop', 'content', '108600'),
    path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam', 'steamapps', 'workshop', 'content', '108600'),
    path.join(home, 'Zomboid', 'mods'),
    path.join(home, 'Zomboid', 'workshop', 'content', '108600')
  ];

  for (const p of defaultSteamPaths) {
    if (fs.existsSync(p)) {
      searchPaths.add(path.normalize(p));
    }
  }

  return Array.from(searchPaths).filter(p => fs.existsSync(p));
}

/**
 * Recursively finds files matching a predicate inside a directory with deep maxDepth.
 */
function findFilesRecursive(dirPath, predicate, maxDepth = 15, currentDepth = 0) {
  const results = [];
  if (!fs.existsSync(dirPath) || currentDepth > maxDepth) return results;

  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...findFilesRecursive(fullPath, predicate, maxDepth, currentDepth + 1));
        } else if (predicate(item, fullPath)) {
          results.push(fullPath);
        }
      } catch (e) {}
    }
  } catch (e) {}

  return results;
}

/**
 * Parses a PZ sandbox-options.txt file.
 */
function parseSandboxOptionsTxt(filePath) {
  const options = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const optionRegex = /option\s+([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\s*\{([^}]+)\}/gi;
    let match;

    while ((match = optionRegex.exec(content)) !== null) {
      const table = match[1];
      const key = match[2];
      const body = match[3];

      let type = 'string';
      const typeMatch = body.match(/type\s*=\s*([a-zA-Z0-9_]+)/i);
      if (typeMatch) {
        const rawType = typeMatch[1].toLowerCase();
        if (rawType === 'boolean' || rawType === 'bool') type = 'boolean';
        else if (rawType === 'integer' || rawType === 'int') type = 'integer';
        else if (rawType === 'double' || rawType === 'float') type = 'float';
        else if (rawType === 'enum') type = 'enum';
        else type = 'string';
      }

      let defaultVal = null;
      const defMatch = body.match(/default\s*=\s*([^,\r\n]+)/i);
      if (defMatch) {
        const rawDef = defMatch[1].trim();
        if (type === 'boolean') defaultVal = rawDef.toLowerCase() === 'true';
        else if (type === 'integer' || type === 'enum') defaultVal = parseInt(rawDef, 10);
        else if (type === 'float') defaultVal = parseFloat(rawDef);
        else defaultVal = rawDef.replace(/^["']|["']$/g, '');
      }

      let min = null;
      let max = null;
      const minMatch = body.match(/min\s*=\s*([0-9.,-]+)/i);
      const maxMatch = body.match(/max\s*=\s*([0-9.,-]+)/i);
      if (minMatch) min = parseFloat(minMatch[1]);
      if (maxMatch) max = parseFloat(maxMatch[1]);

      let translation = `${table}_${key}`;
      const transMatch = body.match(/translation\s*=\s*([A-Za-z0-9_]+)/i);
      if (transMatch) translation = transMatch[1];

      options.push({
        table,
        key,
        path: `${table}.${key}`,
        type,
        defaultVal,
        min,
        max,
        translationKey: translation
      });
    }
  } catch (e) {
    console.warn(`[ModScanner] Error reading ${filePath}:`, e.message);
  }

  return options;
}

/**
 * Loads translations from Sandbox.json, Sandbox_EN.txt, or Sandbox_HU.txt.
 */
function loadTranslations(modDir) {
  const translations = {};
  const transFiles = findFilesRecursive(modDir, (name, full) => {
    const lower = name.toLowerCase();
    if (lower === 'sandbox-options.txt') return false;
    return (lower.startsWith('sandbox') || full.toLowerCase().includes('translate')) && 
           (lower.endsWith('.json') || lower.endsWith('.txt'));
  }, 15);

  // Sort so generic/other languages load first (score 1), EN loads after (score 2), HU loads last (score 3)
  transFiles.sort((a, b) => {
    const score = (p) => {
      const norm = p.replace(/\\/g, '/').toLowerCase();
      if (norm.includes('/hu/') || norm.includes('_hu.') || norm.includes('hungarian')) return 3;
      if (norm.includes('/en/') || norm.includes('_en.') || norm.includes('english')) return 2;
      return 1;
    };
    return score(a) - score(b);
  });

  for (const tf of transFiles) {
    try {
      if (tf.endsWith('.json')) {
        const json = fs.readJsonSync(tf);
        for (const [k, v] of Object.entries(json)) {
          if (typeof v === 'string') {
            translations[k] = cleanTranslationText(v);
          }
        }
      } else {
        const text = fs.readFileSync(tf, 'utf-8');
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*["'](.+?)["'](?:,)?$/);
          if (match) {
            translations[match[1]] = cleanTranslationText(match[2]);
          }
        }
      }
    } catch (e) {}
  }

  return translations;
}

function cleanTranslationText(str) {
  if (!str) return '';
  return str
    .replace(/\\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\"/g, '"')
    .trim();
}

/**
 * Scans all installed mods and returns a map of all available mod sandbox options with full translations and tooltips.
 */
function scanAllModSandboxOptions() {
  const searchPaths = getModSearchPaths();
  const allDiscoveredOptions = [];

  for (const rootPath of searchPaths) {
    if (!fs.existsSync(rootPath)) continue;

    try {
      const topItems = fs.readdirSync(rootPath);
      for (const item of topItems) {
        const modItemPath = path.join(rootPath, item);
        let stat;
        try { stat = fs.statSync(modItemPath); } catch (e) { continue; }
        if (!stat.isDirectory()) continue;

        // Search for sandbox-options.txt with depth 15
        const sandboxFiles = findFilesRecursive(modItemPath, (name) => name.toLowerCase() === 'sandbox-options.txt', 15);
        if (sandboxFiles.length === 0) continue;

        // Load translations for this mod with depth 15
        const translations = loadTranslations(modItemPath);

        // Read mod info if mod.info exists
        let modTitle = item;
        const modInfoFiles = findFilesRecursive(modItemPath, (name) => name.toLowerCase() === 'mod.info', 10);
        if (modInfoFiles.length > 0) {
          try {
            const infoText = fs.readFileSync(modInfoFiles[0], 'utf-8');
            const nameMatch = infoText.match(/^name\s*=\s*(.+)$/m);
            if (nameMatch) modTitle = nameMatch[1].trim();
          } catch (e) {}
        }

        const seenOptionPaths = new Set();

        for (const sf of sandboxFiles) {
          const parsed = parseSandboxOptionsTxt(sf);
          for (const opt of parsed) {
            if (seenOptionPaths.has(opt.path)) continue;
            seenOptionPaths.add(opt.path);

            // Match translations with comprehensive key permutations
            const labelCandidates = [
              `Sandbox_${opt.translationKey}`,
              `Sandbox_${opt.table}_${opt.key}`,
              `Sandbox_${opt.table}${opt.key}`,
              `Sandbox_${opt.key}`,
              opt.translationKey,
              `${opt.table}_${opt.key}`
            ];

            const tooltipCandidates = [
              `Sandbox_${opt.translationKey}_tooltip`,
              `Sandbox_${opt.translationKey}_Tooltip`,
              `Sandbox_${opt.table}_${opt.key}_tooltip`,
              `Sandbox_${opt.table}_${opt.key}_Tooltip`,
              `Sandbox_${opt.table}${opt.key}_tooltip`,
              `Sandbox_${opt.table}${opt.key}_Tooltip`,
              `Sandbox_${opt.key}_tooltip`,
              `${opt.translationKey}_tooltip`,
              `${opt.table}_${opt.key}_tooltip`
            ];

            let label = opt.key;
            for (const cand of labelCandidates) {
              if (translations[cand]) {
                label = translations[cand];
                break;
              }
            }

            let description = '';
            for (const cand of tooltipCandidates) {
              if (translations[cand]) {
                description = translations[cand];
                break;
              }
            }

            // Enum choices if any
            const options = [];
            if (opt.type === 'enum' || (opt.min !== null && opt.max !== null && opt.max <= 10)) {
              const start = opt.min !== null ? opt.min : 1;
              const end = opt.max !== null ? opt.max : 5;
              for (let i = start; i <= end; i++) {
                const optLabelCandidates = [
                  `Sandbox_${opt.translationKey}_option${i}`,
                  `Sandbox_${opt.translationKey}_Option${i}`,
                  `Sandbox_${opt.table}_${opt.key}_option${i}`,
                  `Sandbox_${opt.table}_${opt.key}_Option${i}`,
                  `Sandbox_${opt.translationKey}_Values_option${i}`,
                  `Sandbox_${opt.table}_${opt.key}_Values_option${i}`,
                  `Sandbox_${opt.key}_option${i}`
                ];
                let choiceLabel = `Option ${i}`;
                for (const oc of optLabelCandidates) {
                  if (translations[oc]) {
                    choiceLabel = translations[oc];
                    break;
                  }
                }
                options.push({ value: i, label: choiceLabel });
              }
            }

            allDiscoveredOptions.push({
              table: opt.table,
              key: opt.key,
              path: opt.path,
              type: opt.type,
              defaultVal: opt.defaultVal,
              min: opt.min,
              max: opt.max,
              options: options.length > 0 ? options : null,
              label,
              description,
              modName: modTitle,
              sourceFile: sf,
              isMod: true
            });
          }
        }
      }
    } catch (e) {
      console.warn(`[ModScanner] Error scanning ${rootPath}:`, e.message);
    }
  }

  // Deduplicate by path
  const uniqueOptions = new Map();
  for (const opt of allDiscoveredOptions) {
    if (!uniqueOptions.has(opt.path)) {
      uniqueOptions.set(opt.path, opt);
    }
  }

  return Array.from(uniqueOptions.values());
}

module.exports = {
  getModSearchPaths,
  scanAllModSandboxOptions
};
