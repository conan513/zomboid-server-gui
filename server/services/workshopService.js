const axios = require('axios');
const cheerio = require('cheerio');

// Extracts Workshop ID from URL or raw number
function extractWorkshopId(input) {
  if (!input) return null;
  const str = input.toString().trim();
  const urlMatch = str.match(/[?&]id=(\d+)/);
  if (urlMatch) return urlMatch[1];
  
  const numMatch = str.match(/^(\d+)$/);
  if (numMatch) return numMatch[1];

  const genericMatch = str.match(/(\d{6,15})/);
  if (genericMatch) return genericMatch[1];

  return null;
}

// Parse Mod IDs and Map names from description text
function parseModInfoFromText(text) {
  const modIds = new Set();
  const mapFolders = new Set();
  const workshopIds = new Set();

  if (!text) return { modIds: [], mapFolders: [], workshopIds: [] };

  // Match Mod ID / ModID lines
  // e.g. "Mod ID: Brita_2", "ModID: AuthenticZLite", "Mod ID: mod1, mod2"
  const modIdRegexes = [
    /(?:Mod\s*ID|ModID|Mod_ID|Mod-ID)\s*[:=]\s*([^\r\n<]+)/gi,
    /\[b\]Mod\s*ID:?\s*\[\/b\]\s*([^\r\n<]+)/gi
  ];

  for (const regex of modIdRegexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[1].replace(/\[\/?[^\]]+\]/g, '').trim();
      // Split by commas, slashes, or multiple spaces if any
      const parts = raw.split(/[,;\/|]/).map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        // Remove trailing quotes, periods or tags
        const cleaned = p.replace(/^[ "']+|[ "'\.]+$/g, '').trim();
        if (cleaned && cleaned.length > 1 && !cleaned.toLowerCase().startsWith('http') && !cleaned.includes('workshop')) {
          modIds.add(cleaned);
        }
      }
    }
  }

  // Match Map Folder / Map Name lines
  const mapRegexes = [
    /(?:Map\s*Folder|MapFolder|Map\s*Name|MapName)\s*[:=]\s*([^\r\n<]+)/gi,
    /\[b\]Map\s*Folder:?\s*\[\/b\]\s*([^\r\n<]+)/gi
  ];

  for (const regex of mapRegexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[1].replace(/\[\/?[^\]]+\]/g, '').trim();
      const parts = raw.split(/[,;\/|]/).map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        const cleaned = p.replace(/^[ "']+|[ "'\.]+$/g, '').trim();
        if (cleaned && cleaned.length > 1) {
          mapFolders.add(cleaned);
        }
      }
    }
  }

  // Match Workshop ID lines if present inside description
  const workshopRegexes = [
    /(?:Workshop\s*ID|WorkshopID)\s*[:=]\s*(\d+)/gi
  ];
  for (const regex of workshopRegexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) workshopIds.add(match[1]);
    }
  }

  return {
    modIds: Array.from(modIds),
    mapFolders: Array.from(mapFolders),
    workshopIds: Array.from(workshopIds)
  };
}

async function fetchWorkshopDetails(workshopIdOrUrl) {
  const workshopId = extractWorkshopId(workshopIdOrUrl);
  if (!workshopId) {
    throw new Error('Invalid Workshop ID or URL provided.');
  }

  let modData = {
    workshopId,
    title: `Mod ${workshopId}`,
    description: '',
    previewUrl: '',
    author: '',
    authorAvatar: '',
    timeUpdated: null,
    fileSize: '',
    tags: [],
    modIds: [],
    selectedModIds: [], // Enabled Mod IDs for this workshop item
    mapFolders: [],
    requiredItems: [],
    url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${workshopId}`
  };

  // 1. Try fetching via Steam Web API RemoteStorage (fast & structured)
  try {
    const params = new URLSearchParams();
    params.append('itemcount', '1');
    params.append('publishedfileids[0]', workshopId);

    const apiRes = await axios.post(
      'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/',
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 8000
      }
    );

    const details = apiRes.data?.response?.publishedfiledetails?.[0];
    if (details && details.result === 1) {
      modData.title = details.title || modData.title;
      modData.description = details.description || '';
      modData.previewUrl = details.preview_url || '';
      modData.timeUpdated = details.time_updated ? new Date(details.time_updated * 1000).toISOString() : null;
      if (details.file_size) {
        modData.fileSize = `${(details.file_size / (1024 * 1024)).toFixed(2)} MB`;
      }
      if (details.tags && Array.isArray(details.tags)) {
        modData.tags = details.tags.map(t => t.tag);
      }

      const parsed = parseModInfoFromText(details.description || '');
      modData.modIds = parsed.modIds;
      modData.mapFolders = parsed.mapFolders;
    }
  } catch (err) {
    console.warn(`[Workshop] Steam API call failed for ${workshopId}, falling back to scraping:`, err.message);
  }

  // 2. Scrape Steam Community Page for richer content (Required Items, avatar, fallback images)
  try {
    const webRes = await axios.get(`https://steamcommunity.com/sharedfiles/filedetails/?id=${workshopId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const $ = cheerio.load(webRes.data);

    // Title fallback
    const pageTitle = $('.workshopItemTitle').text().trim();
    if (pageTitle) modData.title = pageTitle;

    // Image fallback
    if (!modData.previewUrl) {
      const mainImg = $('#previewImageMain').attr('src') || $('#previewImage').attr('src') || $('.workshopItemPreviewImageMain').attr('src');
      if (mainImg) modData.previewUrl = mainImg;
    }

    // Author & avatar
    const authorName = $('.friendBlockContent').contents().first().text().trim() || $('.breadcrumbs a').last().text().trim();
    if (authorName) modData.author = authorName;
    const authorAvatar = $('.playerAvatar img').attr('src');
    if (authorAvatar) modData.authorAvatar = authorAvatar;

    // Web Description parsing (often has HTML tags cleaned out or better formatting)
    const webDescHtml = $('#highlightContent').html() || $('.workshopItemDescription').html() || '';
    const webDescText = $('#highlightContent').text() || $('.workshopItemDescription').text() || '';
    if (!modData.description || webDescText.length > modData.description.length) {
      modData.description = webDescText.trim();
    }

    // Parse mod IDs from web text
    const parsedWeb = parseModInfoFromText(webDescText + '\n' + webDescHtml);
    for (const m of parsedWeb.modIds) {
      if (!modData.modIds.includes(m)) modData.modIds.push(m);
    }
    for (const mf of parsedWeb.mapFolders) {
      if (!modData.mapFolders.includes(mf)) modData.mapFolders.push(mf);
    }

    // Required Items (dependencies)
    $('#RequiredItems a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const reqId = extractWorkshopId(href);
      const reqTitle = $(el).text().trim();
      if (reqId && reqId !== workshopId) {
        if (!modData.requiredItems.find(r => r.workshopId === reqId)) {
          modData.requiredItems.push({
            workshopId: reqId,
            title: reqTitle || `Required Item ${reqId}`,
            url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${reqId}`
          });
        }
      }
    });

  } catch (err) {
    console.warn(`[Workshop] Web scrape failed for ${workshopId}:`, err.message);
  }

  // If no Mod ID was detected in description, default to title or Workshop ID
  if (modData.modIds.length === 0) {
    // If title has sensible identifier or use workshopId
    modData.modIds = [modData.title.replace(/[^a-zA-Z0-9_\-\.]/g, '').trim() || workshopId];
  }

  // By default, select all detected mod IDs
  modData.selectedModIds = [...modData.modIds];

  return modData;
}

// Batch fetch multiple Workshop IDs
async function batchFetchWorkshop(workshopIds) {
  const results = [];
  for (const id of workshopIds) {
    try {
      const data = await fetchWorkshopDetails(id);
      results.push(data);
    } catch (e) {
      console.error(`Failed to fetch mod ${id}:`, e.message);
      results.push({
        workshopId: id,
        title: `Mod ${id} (Failed to load details)`,
        description: '',
        previewUrl: '',
        modIds: [id],
        selectedModIds: [id],
        mapFolders: [],
        requiredItems: []
      });
    }
  }
  return results;
}

module.exports = {
  extractWorkshopId,
  parseModInfoFromText,
  fetchWorkshopDetails,
  batchFetchWorkshop
};
