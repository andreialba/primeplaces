import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { LRUCache } from 'lru-cache';
import { GoogleGenAI, Type } from '@google/genai';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          connectSrc: ["'self'", 'https:'],
          upgradeInsecureRequests: [],
        },
      }
    : false,
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '10kb' }));

// Initialize SQLite for persistent caching
const db = new Database('cache.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS api_cache (
    key TEXT PRIMARY KEY,
    value TEXT,
    expires_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS trending_cities (
    name TEXT PRIMARY KEY,
    search_count INTEGER DEFAULT 1,
    last_searched INTEGER
  );
`);

// Helper to get from cache
function getCache(key: string) {
  const row = db.prepare('SELECT value, expires_at FROM api_cache WHERE key = ?').get(key) as any;
  if (!row) return null;
  
  if (Date.now() > row.expires_at) {
    db.prepare('DELETE FROM api_cache WHERE key = ?').run(key);
    return null;
  }
  
  try {
    return JSON.parse(row.value);
  } catch (e) {
    return null;
  }
}

// Helper to set cache (default 3 days)
function setCache(key: string, value: any, ttl = 1000 * 60 * 60 * 24 * 3) {
  const expiresAt = Date.now() + ttl;
  db.prepare('INSERT OR REPLACE INTO api_cache (key, value, expires_at) VALUES (?, ?, ?)')
    .run(key, JSON.stringify(value), expiresAt);
}

// Helper to increment trending city
function incrementTrendingCity(name: string) {
  if (!name) return;
  // Normalize name
  const normalized = name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  db.prepare(`
    INSERT INTO trending_cities (name, search_count, last_searched)
    VALUES (?, 1, ?)
    ON CONFLICT(name) DO UPDATE SET
      search_count = search_count + 1,
      last_searched = ?
  `).run(normalized, Date.now(), Date.now());
}

// In-memory cache for frequently accessed items (keep it for speed)
const placesCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24, // 24 hours in-memory
});

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    record.count += 1;
    next();
  };
}

function getGoogleApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY;
}

function getGeminiApiKey() {
  const apiKey = process.env.CUSTOM_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'YOUR_GEMINI_API_KEY') {
    return null;
  }
  return apiKey;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const autocompleteLimiter = createRateLimiter(60, 60 * 1000);
const staticMapLimiter = createRateLimiter(90, 60 * 1000);
const placesLimiter = createRateLimiter(20, 60 * 1000);
const aiSummaryLimiter = createRateLimiter(15, 60 * 1000);

app.use('/api/autocomplete', autocompleteLimiter);
app.use('/api/static-map', staticMapLimiter);
app.use('/api/places', placesLimiter);
app.use('/api/ai/summary', aiSummaryLimiter);

app.get('/api/static-map', async (req, res) => {
  try {
    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY is not configured' });
    }

    const centerLat = Number(req.query.centerLat);
    const centerLng = Number(req.query.centerLng);
    const zoom = Math.min(Math.max(Number(req.query.zoom) || 13, 1), 20);
    const width = Math.min(Math.max(Number(req.query.width) || 1200, 100), 1280);
    const height = Math.min(Math.max(Number(req.query.height) || 700, 100), 1280);
    const scale = Math.min(Math.max(Number(req.query.scale) || 2, 1), 2);

    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
      return res.status(400).json({ error: 'Invalid center coordinates' });
    }

    let markers: Array<{ lat: number; lng: number; label?: string }> = [];
    if (typeof req.query.markers === 'string') {
      try {
        const parsed = JSON.parse(req.query.markers);
        if (Array.isArray(parsed)) {
          markers = parsed
            .slice(0, 20)
            .filter((marker) =>
              marker &&
              Number.isFinite(Number(marker.lat)) &&
              Number.isFinite(Number(marker.lng))
            )
            .map((marker) => ({
              lat: Number(marker.lat),
              lng: Number(marker.lng),
              label: typeof marker.label === 'string' ? marker.label.slice(0, 1) : undefined,
            }));
        }
      } catch {
        return res.status(400).json({ error: 'Invalid markers payload' });
      }
    }

    const params = new URLSearchParams({
      center: `${centerLat},${centerLng}`,
      zoom: String(zoom),
      size: `${width}x${height}`,
      scale: String(scale),
      maptype: 'roadmap',
      key: apiKey,
      style: 'feature:poi|visibility:off',
    });

    if (markers.length > 0) {
      for (const marker of markers) {
        const label = marker.label ? `|label:${marker.label}` : '';
        params.append('markers', `color:red${label}|${marker.lat},${marker.lng}`);
      }
    } else {
      params.append('markers', `color:red|${centerLat},${centerLng}`);
    }

    const response = await axios.get(`https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`, {
      responseType: 'arraybuffer',
    });

    const contentType = typeof response.headers['content-type'] === 'string'
      ? response.headers['content-type']
      : 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  } catch (error: any) {
    console.error('Static map error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to render static map' });
  }
});

app.get('/api/trending', (req, res) => {
  try {
    const rows = db.prepare('SELECT name FROM trending_cities ORDER BY search_count DESC, last_searched DESC LIMIT 6').all() as any[];
    // If we have fewer than 6, add some defaults
    const defaults = ['London', 'New York', 'Paris', 'Tokyo', 'Rome', 'Dubai'];
    const results = [...rows.map(r => r.name)];
    
    for (const city of defaults) {
      if (results.length >= 6) break;
      if (!results.includes(city)) results.push(city);
    }

    res.json(results.map(name => ({
      name,
      image: `/api/location-photo/${encodeURIComponent(name)}`
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending cities' });
  }
});

app.get('/api/autocomplete', async (req, res) => {
  try {
    const { q, sessiontoken } = req.query;
    const query = (q as string) || '';
    if (query.length < 3 || query.length > 200) return res.json({ predictions: [] });

    const cacheKey = `autocomplete-${query}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ predictions: cached });

    if (!getGoogleApiKey()) {
      return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY is not configured' });
    }

    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=geocode&key=${getGoogleApiKey()}`;
    if (sessiontoken && /^[a-zA-Z0-9\-._~]+$/.test(sessiontoken as string)) {
      url += `&sessiontoken=${encodeURIComponent(sessiontoken as string)}`;
    }

    const response = await axios.get(url);
    
    const predictions = response.data.predictions || [];
    setCache(cacheKey, predictions);
    res.json({ predictions });
  } catch (error: any) {
    console.error('Autocomplete error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch autocomplete' });
  }
});

app.get('/api/photo/*', async (req, res) => {
  try {
    const photoName = req.params[0];
    if (!photoName || !getGoogleApiKey()) {
      return res.redirect('https://picsum.photos/400/300');
    }
    
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${getGoogleApiKey()}`;
    res.redirect(url);
  } catch (error) {
    res.redirect('https://picsum.photos/400/300');
  }
});

app.get('/api/location-photo/:location', async (req, res) => {
  try {
    const { location } = req.params;
    if (!getGoogleApiKey()) {
      return res.redirect(`https://picsum.photos/seed/${location}/800/600`);
    }

    const cacheKey = `location-photo-${location}`;
    let photoUrl = getCache(cacheKey);

    if (!photoUrl) {
      const response = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        {
          textQuery: `${location} landmarks`,
          maxResultCount: 1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': getGoogleApiKey(),
            'X-Goog-FieldMask': 'places.photos',
          },
        }
      );

      const photoName = response.data.places?.[0]?.photos?.[0]?.name;
      if (photoName) {
        photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${getGoogleApiKey()}`;
        // Cache location photos for 30 days as they rarely change
        setCache(cacheKey, photoUrl, 1000 * 60 * 60 * 24 * 30);
      } else {
        photoUrl = `https://picsum.photos/seed/${location}/800/600`;
      }
    }

    res.redirect(photoUrl as string);
  } catch (error) {
    res.redirect(`https://picsum.photos/seed/${req.params.location}/800/600`);
  }
});

// Proxy for Google Places API
app.post('/api/places', async (req, res) => {
  try {
    const { location, type, typeId, minRating, minReviews, sortBy, radius } = req.body;

    if (!location || typeof location !== 'string' || location.length > 200) {
      return res.status(400).json({ error: 'Invalid location' });
    }
    if (radius !== undefined && (typeof radius !== 'number' || radius < 0 || radius > 500)) {
      return res.status(400).json({ error: 'Invalid radius' });
    }

    if (!getGoogleApiKey()) {
      return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY is not configured' });
    }

    // Track trending cities
    incrementTrendingCity(location);

    const locationCacheKey = `location-geocode-${location}`;
    let geocodeData: any = getCache(locationCacheKey);

    if (!geocodeData) {
      const geocodeRes = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${getGoogleApiKey()}`
      );
      
      if (geocodeRes.data.results && geocodeRes.data.results.length > 0) {
        geocodeData = geocodeRes.data.results[0].geometry;
        setCache(locationCacheKey, geocodeData);
      }
    }

    let locationRestriction;
    if (geocodeData) {
      if (radius && radius > 0) {
        const lat = geocodeData.location.lat;
        const lng = geocodeData.location.lng;
        const radiusKm = radius;
        const latDelta = radiusKm / 111.32;
        const lngDelta = radiusKm / (111.32 * Math.cos(lat * (Math.PI / 180)));
        
        locationRestriction = {
          rectangle: {
            low: { latitude: lat - latDelta, longitude: lng - lngDelta },
            high: { latitude: lat + latDelta, longitude: lng + lngDelta }
          }
        };
      } else if (geocodeData.viewport) {
        locationRestriction = {
          rectangle: {
            low: {
              latitude: geocodeData.viewport.southwest.lat,
              longitude: geocodeData.viewport.southwest.lng
            },
            high: {
              latitude: geocodeData.viewport.northeast.lat,
              longitude: geocodeData.viewport.northeast.lng
            }
          }
        };
      }
    }

    let allPlaces: any[] = [];
    
    if (typeId === 'all') {
      const categories = ['restaurant', 'tourist_attraction', 'museum', 'cafe', 'park', 'shopping_mall'];
      
      const results = await Promise.all(categories.map(async (cat) => {
        const catCacheKey = `places-${location}-${cat}-${radius}`;
        const cached = getCache(catCacheKey);
        if (cached) return cached;

        const query = `best ${cat} in ${location}`;
        const requestBody: any = {
          textQuery: query,
          pageSize: 20,
          includedType: cat,
        };
        if (locationRestriction) {
          requestBody.locationRestriction = locationRestriction;
        }
        
        try {
          const response = await axios.post(
            'https://places.googleapis.com/v1/places:searchText',
            requestBody,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': getGoogleApiKey(),
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.priceLevel,places.photos,places.location',
              },
            }
          );
          
          const newPlaces = response.data.places || [];
          setCache(catCacheKey, newPlaces);
          return newPlaces;
        } catch (err: any) {
          console.error(`Error fetching ${cat}:`, err.message);
          return [];
        }
      }));
      
      allPlaces = results.flat();
      
      // Remove duplicates by ID and filter out locality/political results
      const seen = new Set();
      allPlaces = allPlaces.filter(p => {
        if (!p.id || seen.has(p.id)) return false;
        const types = p.types || [];
        if (types.includes('locality') || types.includes('political') || types.includes('administrative_area_level_1')) {
          return false;
        }
        seen.add(p.id);
        return true;
      });
    } else {
      const singleCacheKey = `places-${location}-${typeId}-${radius}`;
      const cached = getCache(singleCacheKey);
      
      if (cached) {
        allPlaces = cached;
      } else {
        let query;
        if (typeId === 'nature_recreation') {
          query = `best hiking areas, mountain peaks, nature preserves, islands, rivers, and scenic spots in ${location}`;
        } else {
          query = `best ${type} in ${location}`;
        }
        
        const requestBody: any = {
          textQuery: query,
          pageSize: 20,
        };
        if (typeId && typeId !== 'nature_recreation') {
          requestBody.includedType = typeId;
        }
        if (locationRestriction) {
          requestBody.locationRestriction = locationRestriction;
        }

        const response = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': getGoogleApiKey(),
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.priceLevel,places.photos,places.location',
            },
          }
        );
        
        allPlaces = response.data.places || [];
        setCache(singleCacheKey, allPlaces);
      }
    }

    // Remove duplicates by ID and filter out locality/political results
    const seen = new Set();
    const uniquePlaces = allPlaces.filter(p => {
      if (!p.id || seen.has(p.id)) return false;
      const types = p.types || [];
      if (types.includes('locality') || types.includes('political') || types.includes('administrative_area_level_1')) {
        return false;
      }
      seen.add(p.id);
      return true;
    });

    let center = null;
    if (geocodeData?.location) {
      center = {
        latitude: geocodeData.location.lat,
        longitude: geocodeData.location.lng
      };
    } else if (uniquePlaces.length > 0 && uniquePlaces[0].location) {
      center = uniquePlaces[0].location;
    }

    res.json({ 
      places: uniquePlaces,
      center
    });
  } catch (error: any) {
    console.error('Error fetching places:', JSON.stringify(error.response?.data || error.message, null, 2));
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

// AI Summary Endpoint (Fast AI responses)
app.post('/api/ai/summary', async (req, res) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured. Add one to enable AI summaries.' });
    }

    const placeName = (typeof req.body.placeName === 'string' ? req.body.placeName : '').substring(0, 200);
    const location = (typeof req.body.location === 'string' ? req.body.location : '').substring(0, 200);
    const type = (typeof req.body.type === 'string' ? req.body.type : '').substring(0, 100);
    if (!placeName || !location) return res.status(400).json({ error: 'Missing placeName or location' });
    const cacheKey = `ai-summary-v3-${placeName}-${location}-${type}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ summary: cached });

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Provide a detailed, structured summary for ${placeName}, a ${type} in ${location}. 
    Be honest and specific. If you don't have exact data, provide a highly probable estimate based on the location and type.
    
    Fields required:
    1. summary: A short, engaging 2-sentence overview.
    2. vibe: 2-3 tags separated by dots (e.g., "Loud · Casual · Touristy").
    3. insights: An array of 3-5 relevant insight objects. Each object must have:
       - label: A short label (e.g., "Best For", "Don't Miss", "Avoid If", "Price", "Best Time", "Stay Length", "Vibe Check").
       - value: The specific insight text.
       - icon: One of these strings: "users", "heart", "alert", "clock", "banknote", "map", "zap", "coffee", "bed".
    
    Only include insights that are truly relevant to a ${type}. For example, "Best Time" is great for parks but maybe not for hotels. "Stay Length" is great for museums.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            vibe: { type: Type.STRING },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                  icon: { type: Type.STRING },
                },
                required: ['label', 'value', 'icon'],
              }
            },
          },
          required: ['summary', 'vibe', 'insights'],
        }
      }
    });
    
    const summaryData = JSON.parse(response.text);
    setCache(cacheKey, summaryData);
    res.json({ summary: summaryData });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    if (error.message?.includes('API key not valid')) {
      return res.status(400).json({ error: 'Invalid API key. Please set a valid GEMINI_API_KEY in your .env file.' });
    }
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
