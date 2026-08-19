const fs = require('fs-extra');
const path = require('path');
const { getSettings } = require('../config');

function getServerSandboxPath(serverName) {
  const settings = getSettings();
  const name = serverName || settings.serverName || 'servertest';
  return path.join(settings.zomboidUserDataPath, 'Server', `${name}_SandboxVars.lua`);
}

// Category mappings for top-level General keys to make the UI clean and intuitive
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

function parseSandboxFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, raw: '', categories: [], flatVars: {} };
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  
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

    // Check sub-table start
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

    // Check table end
    if (trimmed === '},') {
      currentTable = 'General';
      currentCommentLines = [];
      continue;
    }

    // Check key = value
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

      const fullComment = currentCommentLines.join('\n');
      currentCommentLines = [];

      let options = null;
      let min = null;
      let max = null;
      let defaultVal = null;
      let description = fullComment;

      // Parse options e.g. "1 = Easy\n2 = Normal"
      const optMatches = fullComment.match(/^\s*(\d+)\s*=\s*([^\n\r]+)/gm);
      if (optMatches && optMatches.length > 0 && type !== 'boolean') {
        options = optMatches.map(m => {
          const p = m.match(/(\d+)\s*=\s*(.+)/);
          return { value: Number(p[1]), label: p[2].trim() };
        });
      }

      const minMatch = fullComment.match(/Minimum=([0-9.,-]+)/i);
      const maxMatch = fullComment.match(/Maximum=([0-9.,-]+)/i);
      const defMatch = fullComment.match(/Alapbeállítás=([^\n\r,]+)/i);

      if (minMatch) min = parseFloat(minMatch[1].replace(',', '.'));
      if (maxMatch) max = parseFloat(maxMatch[1].replace(',', '.'));
      if (defMatch) defaultVal = defMatch[1].trim();

      // Clean description by removing option lines for cleaner tooltip
      const descLines = fullComment.split('\n').filter(l => !l.match(/^\s*\d+\s*=\s*/));
      description = descLines.join('\n').trim();

      if (!tables[currentTable]) tables[currentTable] = [];
      tables[currentTable].push({
        table: currentTable,
        key,
        path: currentTable === 'General' ? key : `${currentTable}.${key}`,
        value: val,
        type,
        comment: fullComment,
        description,
        options,
        min,
        max,
        defaultVal
      });
    }
  }

  // Build organized categories
  const categories = [];
  const flatVars = {};

  // 1. Sub-categorize General table
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
        items: groupItems
      });
    }
  }

  // Catch remaining unassigned General items
  const otherGeneralItems = generalItems.filter(item => !assignedGeneralKeys.has(item.key));
  if (otherGeneralItems.length > 0) {
    categories.push({
      id: 'general_misc',
      name: 'Other General Settings',
      isSubTable: false,
      items: otherGeneralItems
    });
  }

  // 2. Add structured sub-tables
  const subTableLabels = {
    ZombieLore: 'Zombie Lore & Anatomy (ZombieLore)',
    ZombieConfig: 'Advanced Zombie Population (ZombieConfig)',
    MultiplierConfig: 'XP & Skill Leveling Multipliers (MultiplierConfig)',
    Map: 'In-Game Map & Minimap (Map)',
    Basement: 'Basements & Underground (Basement)'
  };

  for (const [tableName, items] of Object.entries(tables)) {
    if (tableName === 'General') continue;
    categories.push({
      id: tableName.toLowerCase(),
      name: subTableLabels[tableName] || `${tableName} (Sub-table)`,
      isSubTable: true,
      tableName,
      items
    });
  }

  // Flatten variables map for quick lookup and updates
  for (const [tableName, items] of Object.entries(tables)) {
    for (const item of items) {
      flatVars[item.path] = item.value;
    }
  }

  return {
    exists: true,
    raw,
    categories,
    flatVars
  };
}

function writeSandboxFile(filePath, updatedVars, originalRawContent) {
  fs.ensureDirSync(path.dirname(filePath));

  if (typeof originalRawContent === 'string' && originalRawContent.trim()) {
    const lines = originalRawContent.split(/\r?\n/);
    const newLines = [];
    let currentTable = 'General';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check sub-table start
      const tableMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*\{/);
      if (tableMatch && tableMatch[1] !== 'SandboxVars') {
        currentTable = tableMatch[1];
        newLines.push(line);
        continue;
      }

      if (trimmed === '},') {
        currentTable = 'General';
        newLines.push(line);
        continue;
      }

      const kvMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.+?)(?:,)?$/);
      if (kvMatch && !trimmed.includes('{') && !trimmed.includes('}')) {
        const key = kvMatch[1];
        const varPath = currentTable === 'General' ? key : `${currentTable}.${key}`;

        if (updatedVars && updatedVars.hasOwnProperty(varPath)) {
          const newVal = updatedVars[varPath];
          let formattedVal = newVal;
          if (typeof newVal === 'string') {
            formattedVal = `"${newVal}"`;
          } else if (typeof newVal === 'boolean') {
            formattedVal = newVal ? 'true' : 'false';
          } else if (typeof newVal === 'number') {
            // Keep float representation clean
            formattedVal = Number.isInteger(newVal) ? `${newVal}` : `${newVal}`;
          }

          // Preserve indentation
          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '    ';
          newLines.push(`${indent}${key} = ${formattedVal},`);
          continue;
        }
      }

      newLines.push(line);
    }

    fs.writeFileSync(filePath, newLines.join('\r\n'), 'utf-8');
    return true;
  }

  // Fallback: If no original content, write structured SandboxVars table
  const lines = ['SandboxVars = {'];
  const generalKeys = Object.keys(updatedVars).filter(k => !k.includes('.'));
  const subTableKeys = Object.keys(updatedVars).filter(k => k.includes('.'));

  for (const k of generalKeys) {
    let val = updatedVars[k];
    if (typeof val === 'string') val = `"${val}"`;
    lines.push(`    ${k} = ${val},`);
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
      let val = v;
      if (typeof val === 'string') val = `"${val}"`;
      lines.push(`        ${k} = ${val},`);
    }
    lines.push('    },');
  }

  lines.push('}');
  fs.writeFileSync(filePath, lines.join('\r\n'), 'utf-8');
  return true;
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
  writeRawSandboxFile
};
