// Parse lat/lon from ip_location string like "City, Region, Country (lat, lon) - ISP: xxx"
export function parseIpCoords(ipLocation) {
  if (!ipLocation) return null;
  const match = ipLocation.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
  if (match) return [parseFloat(match[1]), parseFloat(match[2])];
  return null;
}

// Geocode an address using Nominatim (free, no API key)
// Tries multiple strategies to maximize results for Mexican addresses
const geocodeCache = {};
let lastRequestTime = 0;
async function nominatimSearch(query) {
  try {
    // Rate limit: wait at least 1100ms between requests
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < 1100) {
      await new Promise(r => setTimeout(r, 1100 - elapsed));
    }
    lastRequestTime = Date.now();
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=mx`, {
      headers: { 'Accept-Language': 'es' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (e) {
    console.error('Geocode error:', e);
  }
  return null;
}

// Clean Mexican address: remove postal codes, abbreviations, normalize
function simplifyAddress(addr) {
  return addr
    .replace(/C\.?\s*P\.?\s*\d{4,5}/gi, '') // remove C.P 85400
    .replace(/\d{5}/g, '')                   // remove standalone postal codes
    .replace(/CONT\.?\s*\d+/gi, '')          // remove CONT 242
    .replace(/\bCol\.?\b/gi, '')             // remove Col.
    .replace(/\bFracc\.?\b/gi, '')           // remove Fracc.
    .replace(/\bNo\.?\s*\d+/gi, '')          // remove No. 123
    .replace(/\bS\/N\b/gi, '')               // remove S/N
    .replace(/#\d+/g, '')                    // remove #1400
    .replace(/\bCarretera\b.*?(?=,)/i, '')   // remove Carretera ... up to first comma
    .replace(/\bKm\s*\d+/gi, '')             // remove Km 1982
    .replace(/\bSon\.?\b/gi, 'Sonora')       // expand Son. to Sonora
    .replace(/\bGto\.?\b/gi, 'Guanajuato')
    .replace(/\bJal\.?\b/gi, 'Jalisco')
    .replace(/\bChih\.?\b/gi, 'Chihuahua')
    .replace(/\s{2,}/g, ' ')                 // collapse spaces
    .replace(/^[\s,]+/, '')                  // leading commas/spaces
    .replace(/[.,]+\s*$/g, '')               // trailing punctuation
    .trim();
}

// Extract colonia/neighborhood + city from address
function extractColoniaCity(addr) {
  const lower = addr.toLowerCase();
  // Find city first
  let city = null, state = null;
  const cityList = [
    ['guaymas', 'Sonora'], ['hermosillo', 'Sonora'], ['empalme', 'Sonora'],
    ['san carlos', 'Sonora'], ['obregon', 'Sonora'], ['navojoa', 'Sonora'],
    ['nogales', 'Sonora'], ['caborca', 'Sonora'],
  ];
  for (const [c, s] of cityList) {
    if (lower.includes(c)) { city = c; state = s; break; }
  }
  if (!city) return null;
  // Split by commas and find a segment that looks like a colonia name (not the city, not numbers)
  const parts = addr.split(',').map(p => p.trim()).filter(p => {
    const pl = p.toLowerCase();
    return pl && !pl.includes(city) && !/^\d+$/.test(pl) && !/^\s*$/.test(pl)
      && !/son\.?$/i.test(pl) && !/sonora/i.test(pl) && !/\d{5}/.test(pl)
      && !/carretera/i.test(pl) && !/federal/i.test(pl);
  });
  if (parts.length > 0) {
    // Use last qualifying part as colonia
    const colonia = parts[parts.length - 1].replace(/#\d+/g, '').replace(/\d{5}/g, '').trim();
    if (colonia.length > 2) {
      return `${colonia}, ${city}, ${state}, Mexico`;
    }
  }
  return null;
}

// Extract likely city name from address
function extractCity(addr) {
  const cities = [
    ['Guaymas', 'Sonora'], ['Hermosillo', 'Sonora'], ['Obregon', 'Sonora'], ['Ciudad Obregon', 'Sonora'],
    ['Nogales', 'Sonora'], ['Empalme', 'Sonora'], ['Navojoa', 'Sonora'], ['San Carlos', 'Sonora'],
    ['Caborca', 'Sonora'], ['Puerto Peñasco', 'Sonora'], ['Agua Prieta', 'Sonora'], ['Huatabampo', 'Sonora'],
    ['Magdalena', 'Sonora'], ['Cananea', 'Sonora'], ['Bahia de Kino', 'Sonora'],
    ['Los Mochis', 'Sinaloa'], ['Culiacan', 'Sinaloa'], ['Mazatlan', 'Sinaloa'],
    ['Guadalajara', 'Jalisco'], ['Monterrey', 'Nuevo Leon'], ['Tijuana', 'Baja California'],
    ['Mexicali', 'Baja California'], ['Chihuahua', 'Chihuahua'], ['Juarez', 'Chihuahua'],
  ];
  const lower = addr.toLowerCase();
  for (const [city, state] of cities) {
    if (lower.includes(city.toLowerCase())) return `${city}, ${state}, Mexico`;
  }
  return null;
}

export async function geocodeAddress(address) {
  if (!address) return null;
  const key = address.trim().toLowerCase();
  if (geocodeCache[key]) return geocodeCache[key];
  // Try 1: full address as-is
  let coords = await nominatimSearch(address);
  // Try 2: simplified address
  if (!coords) {
    const clean = simplifyAddress(address);
    coords = await nominatimSearch(clean);
  }
  // Try 3: simplified + Mexico
  if (!coords) {
    const clean = simplifyAddress(address);
    coords = await nominatimSearch(clean + ', Mexico');
  }
  // Try 4: colonia + city (e.g. "Loma Linda, Guaymas, Sonora, Mexico")
  if (!coords) {
    const coloniaCity = extractColoniaCity(address);
    if (coloniaCity) {
      console.log('[geo] Trying colonia+city:', coloniaCity);
      coords = await nominatimSearch(coloniaCity);
    }
  }
  // Try 5: extract city name
  if (!coords) {
    const city = extractCity(address);
    if (city) coords = await nominatimSearch(city);
  }
  // Try 6: last meaningful words + Mexico
  if (!coords) {
    const words = simplifyAddress(address).split(/[\s,]+/).filter(w => w.length > 2);
    if (words.length >= 2) {
      coords = await nominatimSearch(words.slice(-3).join(' ') + ', Mexico');
    }
  }
  if (coords) geocodeCache[key] = coords;
  if (!coords) console.warn('[geo] Could not geocode:', address);
  return coords;
}
