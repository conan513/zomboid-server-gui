const fs = require('fs-extra');
const path = require('path');
const { getSettings } = require('../config');
const modSandboxScanner = require('./modSandboxScanner');

function getServerSandboxPath(serverName) {
  const settings = getSettings();
  const name = serverName || settings.serverName || 'servertest';
  return path.join(settings.zomboidUserDataPath, 'Server', `${name}_SandboxVars.lua`);
}

// Known Vanilla Category mappings for top-level General keys
const GENERAL_GROUPS = {
  zombies_general: {
    label: 'Zombies & Spawning',
    keys: [
      'Zombies', 'Distribution', 'ZombieVoronoiNoise', 'ZombieRespawn', 'ZombieMigrate',
      'ZombiesCountBeforeDelete', 'ZombieAttractionMultiplier', 'SirenEffectsZombies',
      'ZombieHealthImpact', 'DecayingCorpseHealthImpact', 'HoursForCorpseRemoval'
    ]
  },
  time_climate: {
    label: 'Time, Climate & Weather',
    keys: [
      'DayLength', 'StartYear', 'StartMonth', 'StartDay', 'StartTime',
      'DayNightCycle', 'ClimateCycle', 'FogCycle', 'Temperature', 'Rain',
      'MaxFogIntensity', 'MaxRainFxIntensity', 'EnableSnowOnGround', 'NightDarkness',
      'NightLength', 'TimeSinceApo', 'ErosionSpeed', 'ErosionDays'
    ]
  },
  world_infrastructure: {
    label: 'World Infrastructure & Utilities',
    keys: [
      'WaterShut', 'ElecShut', 'AlarmDecay', 'WaterShutModifier', 'ElecShutModifier',
      'AlarmDecayModifier', 'Alarm', 'LockedHouses', 'Helicopter', 'MetaEvent',
      'SleepingEvent', 'GeneratorFuelConsumption', 'GeneratorSpawning',
      'AllowExteriorGenerator', 'GeneratorTileRange', 'GeneratorVerticalPowerRange',
      'AnnotatedMapChance', 'FireSpread', 'MaximumFireFuelHours', 'LightBulbLifespan'
    ]
  },
  fuel_stations: {
    label: 'Gas Stations & Fuel Supply',
    keys: [
      'FuelStationGasInfinite', 'FuelStationGasMin', 'FuelStationGasMax', 'FuelStationGasEmptyChance'
    ]
  },
  loot_settings: {
    label: 'Loot & Item Rarity',
    keys: [
      'FoodLootNew', 'LiteratureLootNew', 'SkillBookLoot', 'RecipeResourceLoot',
      'MedicalLootNew', 'SurvivalGearsLootNew', 'CannedFoodLootNew', 'WeaponLootNew',
      'RangedWeaponLootNew', 'AmmoLootNew', 'MechanicsLootNew', 'OtherLootNew',
      'ClothingLootNew', 'ContainerLootNew', 'KeyLootNew', 'MediaLootNew',
      'MementoLootNew', 'CookwareLootNew', 'MaterialLootNew', 'FarmingLootNew',
      'ToolLootNew', 'RollsMultiplier', 'LootItemRemovalList', 'RemoveStoryLoot',
      'RemoveZombieLoot', 'ZombiePopLootEffect', 'InsaneLootFactor', 'ExtremeLootFactor',
      'RareLootFactor', 'NormalLootFactor', 'CommonLootFactor', 'AbundantLootFactor',
      'FoodRotSpeed', 'FridgeFactor', 'SeenHoursPreventLootRespawn', 'HoursForLootRespawn',
      'MaxItemsForLootRespawn', 'ConstructionPreventsLootRespawn', 'WorldItemRemovalList',
      'HoursForWorldItemRemoval', 'ItemRemovalListBlacklistToggle', 'DaysForRottenFoodRemoval',
      'MaximumLooted', 'DaysUntilMaximumLooted', 'RuralLooted', 'MaximumDiminishedLoot',
      'DaysUntilMaximumDiminishedLoot', 'MaximumLootedBuildingRooms'
    ]
  },
  animals_husbandry: {
    label: 'Animals & Livestock (B42)',
    keys: [
      'AnimalStatsModifier', 'AnimalMetaStatsModifier', 'AnimalPregnancyTime',
      'AnimalAgeModifier', 'AnimalMilkIncModifier', 'AnimalWoolIncModifier',
      'AnimalRanchChance', 'AnimalGrassRegrowTime', 'AnimalMetaPredator',
      'AnimalMatingSeason', 'AnimalEggHatch', 'AnimalSoundAttractZombies',
      'AnimalTrackChance', 'AnimalPathChance', 'MaximumRatIndex', 'DaysUntilMaximumRatIndex',
      'AnimalScavenge', 'FishAbundance', 'AnimalAbundance', 'TrappingAbundance'
    ]
  },
  nature_farming: {
    label: 'Farming, Nature & Foraging',
    keys: [
      'Farming', 'CompostTime', 'NatureAbundance', 'PlantResilience', 'PlantAbundance',
      'ScavengeAbundance', 'CropDisease', 'CropSpeed', 'CropWater', 'CropHardiness',
      'KillInsideCrops', 'PlantGrowingSeasons', 'PlaceDirtAboveground', 'FarmingSpeedNew',
      'FarmingAmountNew', 'ClayLakeChance', 'ClayRiverChance', 'MaggotSpawn'
    ]
  },
  combat_firearms: {
    label: 'Combat & Firearms Mechanics',
    keys: [
      'MultiHitZombies', 'AttackBlockMovements', 'FirearmUseDamageChance',
      'FirearmNoiseMultiplier', 'FirearmJamMultiplier', 'FirearmMoodleMultiplier',
      'FirearmWeatherMultiplier', 'FirearmHeadGearEffect'
    ]
  },
  player_character: {
    label: 'Player, Health & Traits',
    keys: [
      'CharacterFreePoints', 'ConstructionBonusPoints', 'StarterKit', 'Nutrition',
      'StatsDecrease', 'EndRegen', 'BoneFracture', 'InjurySeverity',
      'BloodLevel', 'ClothingDegradation', 'RearVulnerability', 'EnableTaintedWaterText',
      'AllowLightBulbRemoval', 'EnablePoisoning', 'NegativeTraitsPenalty',
      'MuscleStrainFactor', 'DiscomfortFactor', 'WoundInfectionFactor',
      'NoBlackClothes', 'AllClothesUnlocked', 'EasyClimbing'
    ]
  },
  world_lore_reading: {
    label: 'Reading, Learning & Media',
    keys: [
      'MinutesPerPage', 'LiteratureCooldown', 'LevelForMediaXPCutoff',
      'LevelForDismantleXPCutoff', 'SeeNotLearntRecipe', 'MetaKnowledge',
      'BloodSplatLifespanDays', 'SurvivorHouseChance', 'VehicleStoryChance', 'ZoneStoryChance'
    ]
  },
  vehicles: {
    label: 'Vehicles & Mechanics',
    keys: [
      'CarSpawnRate', 'ChanceHasGas', 'InitialGas', 'FuelConsumption', 'VehicleEasyUse',
      'CarGasConsumption', 'LockedCar', 'CarGeneralCondition', 'CarDamageOnImpact',
      'DamageToPlayerFromHitByCar', 'DamageToPlayerFromHitByACar', 'TrafficJam', 'CarAlarm',
      'PlayerDamageFromCrash', 'SirenShutoffHours', 'RecentlySurvivorVehicles', 'EnableVehicles'
    ]
  }
};

// Known Vanilla sub-tables
const KNOWN_VANILLA_SUBTABLES = {
  ZombieLore: 'Zombie Lore & Anatomy (ZombieLore)',
  ZombieConfig: 'Advanced Zombie Population (ZombieConfig)',
  MultiplierConfig: 'XP & Skill Leveling Multipliers (MultiplierConfig)',
  Map: 'In-Game Map & Minimap (Map)',
  Basement: 'Basements & Underground (Basement)'
};

function formatTableName(name) {
  if (!name) return '';
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

function parseCommentMetadata(commentLines, type) {
  const fullComment = commentLines.join('\n').trim();
  if (!fullComment) {
    return {
      comment: '',
      description: '',
      options: null,
      min: null,
      max: null,
      defaultVal: null
    };
  }

  let options = null;
  let min = null;
  let max = null;
  let defaultVal = null;

  const optLines = fullComment.split(/\r?\n/);
  const foundOptions = [];

  for (const line of optLines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:\[|\()?(\d+)(?:\]|\))?\s*(?:=|-|:)\s*(.+)$/);
    if (match) {
      foundOptions.push({
        value: Number(match[1]),
        label: match[2].trim()
      });
    }
  }

  if (foundOptions.length > 0 && type !== 'boolean') {
    options = foundOptions;
  }

  const minMatch = fullComment.match(/(?:Minimum|Min)\s*(?:=|:)\s*([0-9.,-]+)/i);
  const maxMatch = fullComment.match(/(?:Maximum|Max)\s*(?:=|:)\s*([0-9.,-]+)/i);
  const defMatch = fullComment.match(/(?:Default|Alapbeállítás|Alapértelmezett)\s*(?:=|:)\s*([^\n\r,;]+)/i);

  if (minMatch) min = parseFloat(minMatch[1].replace(',', '.'));
  if (maxMatch) max = parseFloat(maxMatch[1].replace(',', '.'));
  if (defMatch) defaultVal = defMatch[1].trim();

  const descLines = optLines.filter(l => {
    const t = l.trim();
    if (!t) return false;
    if (t.match(/^(?:\[|\()?(\d+)(?:\]|\))?\s*(?:=|-|:)\s*(.+)$/)) return false;
    if (t.match(/(?:Minimum|Min|Maximum|Max|Default|Alapbeállítás)\s*(?:=|:)/i)) return false;
    return true;
  });

  const description = descLines.join('\n').trim();

  return {
    comment: fullComment,
    description,
    options,
    min,
    max,
    defaultVal
  };
}

/**
 * Dynamically parses SandboxVars.lua and returns both Vanilla categories and organized Mod Groups.
 */
function parseSandboxFile(filePath) {
  let raw = '';
  let lines = [];
  const exists = fs.existsSync(filePath);

  if (exists) {
    raw = fs.readFileSync(filePath, 'utf-8');
    lines = raw.split(/\r?\n/);
  }

  const tables = {};
  let currentTable = 'General';
  tables[currentTable] = [];
  let currentCommentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed === 'SandboxVars = {' || trimmed === '}') {
      continue;
    }

    if (trimmed.startsWith('--')) {
      currentCommentLines.push(trimmed.replace(/^--\s*/, ''));
      continue;
    }

    const tableMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*\{/);
    if (tableMatch) {
      const catName = tableMatch[1];
      if (catName !== 'SandboxVars') {
        currentTable = catName;
        if (!tables[currentTable]) tables[currentTable] = [];
        currentCommentLines = [];
        continue;
      }
    }

    if (trimmed === '},' || trimmed === '}') {
      currentTable = 'General';
      currentCommentLines = [];
      continue;
    }

    const kvMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.+?)(?:,)?$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let valStr = kvMatch[2].trim();
      if (valStr.endsWith(',')) valStr = valStr.slice(0, -1).trim();

      let val = valStr;
      let type = 'string';
      if (valStr === 'true' || valStr === 'false') {
        val = (valStr === 'true');
        type = 'boolean';
      } else if (!isNaN(Number(valStr)) && !valStr.startsWith('"')) {
        val = Number(valStr);
        type = Number.isInteger(val) ? 'integer' : 'float';
      } else if (valStr.startsWith('"') && valStr.endsWith('"')) {
        val = valStr.slice(1, -1);
        type = 'string';
      }

      const meta = parseCommentMetadata(currentCommentLines, type);
      currentCommentLines = [];

      const isModKey = currentTable !== 'General' 
        ? !KNOWN_VANILLA_SUBTABLES.hasOwnProperty(currentTable)
        : !Object.values(GENERAL_GROUPS).some(g => g.keys.includes(key));

      if (!tables[currentTable]) tables[currentTable] = [];
      tables[currentTable].push({
        table: currentTable,
        key,
        path: currentTable === 'General' ? key : `${currentTable}.${key}`,
        value: val,
        type,
        comment: meta.comment,
        description: meta.description,
        options: meta.options,
        min: meta.min,
        max: meta.max,
        defaultVal: meta.defaultVal,
        isMod: isModKey
      });
    }
  }

  // AUTOMATIC MOD DISCOVERY & AUTO-POPULATION
  let autoPopulatedOptionsCount = 0;
  const discoveredModsList = new Set();

  try {
    const discoveredModOptions = modSandboxScanner.scanAllModSandboxOptions();

    for (const dOpt of discoveredModOptions) {
      if (dOpt.modName) discoveredModsList.add(dOpt.modName);

      if (!tables[dOpt.table]) {
        tables[dOpt.table] = [];
      }

      const existingItem = tables[dOpt.table].find(item => item.key === dOpt.key);
      if (existingItem) {
        if (!existingItem.description && dOpt.description) existingItem.description = dOpt.description;
        if (dOpt.label && dOpt.label !== dOpt.key) existingItem.label = dOpt.label;
        if (!existingItem.options && dOpt.options) existingItem.options = dOpt.options;
        if (existingItem.min === null && dOpt.min !== null) existingItem.min = dOpt.min;
        if (existingItem.max === null && dOpt.max !== null) existingItem.max = dOpt.max;
        if (!existingItem.modName && dOpt.modName) existingItem.modName = dOpt.modName;
        existingItem.isMod = true;
      } else {
        const defaultVal = dOpt.defaultVal !== null ? dOpt.defaultVal : (dOpt.type === 'boolean' ? true : 0);
        tables[dOpt.table].push({
          table: dOpt.table,
          key: dOpt.key,
          path: dOpt.path,
          value: defaultVal,
          type: dOpt.type,
          comment: '',
          label: dOpt.label || dOpt.key,
          description: dOpt.description || '',
          options: dOpt.options || null,
          min: dOpt.min !== null ? dOpt.min : null,
          max: dOpt.max !== null ? dOpt.max : null,
          defaultVal: String(defaultVal),
          modName: dOpt.modName,
          isMod: true,
          isAutoDiscovered: true
        });
        autoPopulatedOptionsCount++;
      }
    }
  } catch (err) {
    console.warn('[SandboxParser] Mod scan failed:', err.message);
  }

  // 1. Build Vanilla categories
  const categories = [];
  const flatVars = {};
  let totalKeys = 0;
  let modKeysCount = 0;

  const generalItems = tables['General'] || [];
  const assignedGeneralKeys = new Set();

  for (const [groupId, group] of Object.entries(GENERAL_GROUPS)) {
    const groupItems = generalItems.filter(item => group.keys.includes(item.key));
    groupItems.forEach(item => assignedGeneralKeys.add(item.key));

    if (groupItems.length > 0) {
      categories.push({
        id: groupId,
        name: group.label,
        isSubTable: false,
        isModCategory: false,
        items: groupItems
      });
      totalKeys += groupItems.length;
    }
  }

  // Vanilla Sub-tables
  for (const [tableName, label] of Object.entries(KNOWN_VANILLA_SUBTABLES)) {
    const items = tables[tableName];
    if (items && items.length > 0) {
      categories.push({
        id: tableName.toLowerCase(),
        name: label,
        isSubTable: true,
        isModCategory: false,
        tableName,
        items
      });
      totalKeys += items.length;
    }
  }

  // 2. Build Mod Groups (Grouped strictly by MOD NAME)
  const modGroupsMap = new Map();

  // Any unassigned General items
  const otherGeneralItems = generalItems.filter(item => !assignedGeneralKeys.has(item.key));
  if (otherGeneralItems.length > 0) {
    const generalModTitle = 'Custom & General Mod Settings';
    modGroupsMap.set(generalModTitle, {
      modId: 'general_modded',
      modName: generalModTitle,
      tables: [
        {
          tableName: 'General',
          tableLabel: 'General Modded Keys',
          items: otherGeneralItems
        }
      ]
    });
    totalKeys += otherGeneralItems.length;
    modKeysCount += otherGeneralItems.length;
  }

  // Sub-table items grouped by Mod Name
  for (const [tableName, items] of Object.entries(tables)) {
    if (tableName === 'General' || KNOWN_VANILLA_SUBTABLES.hasOwnProperty(tableName)) {
      continue;
    }

    // Determine Mod Title
    const sampleModName = items.find(i => i.modName)?.modName || `${formatTableName(tableName)} Mod`;
    if (!modGroupsMap.has(sampleModName)) {
      modGroupsMap.set(sampleModName, {
        modId: `mod_${sampleModName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        modName: sampleModName,
        tables: []
      });
    }

    modGroupsMap.get(sampleModName).tables.push({
      tableName,
      tableLabel: formatTableName(tableName),
      items
    });

    totalKeys += items.length;
    modKeysCount += items.length;
  }

  const modGroups = Array.from(modGroupsMap.values()).map(m => ({
    ...m,
    totalOptionsCount: m.tables.reduce((acc, t) => acc + t.items.length, 0)
  }));

  // Flatten variables map for quick lookup and updates
  for (const [tableName, items] of Object.entries(tables)) {
    for (const item of items) {
      flatVars[item.path] = item.value;
    }
  }

  return {
    exists,
    raw,
    categories,
    modGroups,
    flatVars,
    stats: {
      totalKeys,
      vanillaKeysCount: totalKeys - modKeysCount,
      modGroupsCount: modGroups.length,
      modKeysCount,
      isModded: modKeysCount > 0,
      autoPopulatedOptionsCount,
      discoveredMods: Array.from(discoveredModsList)
    }
  };
}

/**
 * Writes updated SandboxVars cleanly to disk, preserving comments, formatting,
 * and dynamically inserting any newly added mod keys/tables.
 */
function writeSandboxFile(filePath, updatedVars, originalRawContent) {
  fs.ensureDirSync(path.dirname(filePath));

  if (typeof originalRawContent === 'string' && originalRawContent.trim()) {
    const lines = originalRawContent.split(/\r?\n/);
    const newLines = [];
    let currentTable = 'General';
    const writtenKeys = new Set();
    const existingTablesInFile = new Set(['General']);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check sub-table start
      const tableMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*\{/);
      if (tableMatch && tableMatch[1] !== 'SandboxVars') {
        currentTable = tableMatch[1];
        existingTablesInFile.add(currentTable);
        newLines.push(line);
        continue;
      }

      // Check sub-table end: before closing sub-table, insert any unwritten keys for this sub-table
      if (trimmed === '},' || (currentTable !== 'General' && trimmed === '}')) {
        if (updatedVars) {
          for (const [varPath, val] of Object.entries(updatedVars)) {
            if (varPath.startsWith(`${currentTable}.`) && !writtenKeys.has(varPath)) {
              const k = varPath.slice(currentTable.length + 1);
              let formattedVal = formatValueForLua(val);
              newLines.push(`        ${k} = ${formattedVal},`);
              writtenKeys.add(varPath);
            }
          }
        }

        currentTable = 'General';
        newLines.push(line);
        continue;
      }

      // Check key = value line
      const kvMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.+?)(?:,)?$/);
      if (kvMatch && !trimmed.includes('{') && !trimmed.includes('}')) {
        const key = kvMatch[1];
        const varPath = currentTable === 'General' ? key : `${currentTable}.${key}`;

        if (updatedVars && updatedVars.hasOwnProperty(varPath)) {
          const newVal = updatedVars[varPath];
          const formattedVal = formatValueForLua(newVal);

          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : (currentTable === 'General' ? '    ' : '        ');
          newLines.push(`${indent}${key} = ${formattedVal},`);
          writtenKeys.add(varPath);
          continue;
        }
      }

      newLines.push(line);
    }

    // Now handle any completely new sub-tables or general keys that didn't exist in the file at all
    if (updatedVars) {
      const remainingKeys = Object.keys(updatedVars).filter(k => !writtenKeys.has(k));
      if (remainingKeys.length > 0) {
        const newGeneralKeys = remainingKeys.filter(k => !k.includes('.'));
        const newSubTableKeys = remainingKeys.filter(k => k.includes('.'));

        let lastBraceIdx = -1;
        for (let j = newLines.length - 1; j >= 0; j--) {
          if (newLines[j].trim() === '}') {
            lastBraceIdx = j;
            break;
          }
        }

        const appendLines = [];

        for (const gk of newGeneralKeys) {
          appendLines.push(`    ${gk} = ${formatValueForLua(updatedVars[gk])},`);
        }

        const newTablesMap = {};
        for (const stk of newSubTableKeys) {
          const [tbl, k] = stk.split('.');
          if (!newTablesMap[tbl]) newTablesMap[tbl] = {};
          newTablesMap[tbl][k] = updatedVars[stk];
        }

        for (const [tbl, keys] of Object.entries(newTablesMap)) {
          if (!existingTablesInFile.has(tbl)) {
            appendLines.push(`    ${tbl} = {`);
            for (const [k, v] of Object.entries(keys)) {
              appendLines.push(`        ${k} = ${formatValueForLua(v)},`);
            }
            appendLines.push('    },');
          }
        }

        if (appendLines.length > 0) {
          if (lastBraceIdx !== -1) {
            newLines.splice(lastBraceIdx, 0, ...appendLines);
          } else {
            newLines.push(...appendLines);
          }
        }
      }
    }

    fs.writeFileSync(filePath, newLines.join('\r\n'), 'utf-8');
    return true;
  }

  // Fallback: If no original content, write structured SandboxVars table
  const lines = ['SandboxVars = {'];
  const generalKeys = Object.keys(updatedVars).filter(k => !k.includes('.'));
  const subTableKeys = Object.keys(updatedVars).filter(k => k.includes('.'));

  for (const k of generalKeys) {
    lines.push(`    ${k} = ${formatValueForLua(updatedVars[k])},`);
  }

  const subTables = {};
  for (const stKey of subTableKeys) {
    const [tbl, k] = stKey.split('.');
    if (!subTables[tbl]) subTables[tbl] = {};
    subTables[tbl][k] = updatedVars[stKey];
  }

  for (const [tbl, keys] of Object.entries(subTables)) {
    lines.push(`    ${tbl} = {`);
    for (const [k, v] of Object.entries(keys)) {
      lines.push(`        ${k} = ${formatValueForLua(v)},`);
    }
    lines.push('    },');
  }

  lines.push('}');
  fs.writeFileSync(filePath, lines.join('\r\n'), 'utf-8');
  return true;
}

function formatValueForLua(val) {
  if (typeof val === 'string') {
    return `"${val}"`;
  } else if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  } else if (typeof val === 'number') {
    return `${val}`;
  }
  return `"${val}"`;
}

function writeRawSandboxFile(filePath, rawContent) {
  fs.ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, rawContent, 'utf-8');
  return true;
}

module.exports = {
  getServerSandboxPath,
  parseSandboxFile,
  writeSandboxFile,
  writeRawSandboxFile,
  formatTableName
};
