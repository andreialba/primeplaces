# Prime Places

Discover the most popular places from Google Maps data. Filter by location, sort by reviews, and find the best spots with AI-powered recommendations.

## Prerequisites

- Node.js (version 18 or higher)
- Google Cloud Console account for API keys

## Google APIs Required

This app uses the following Google APIs:

1. **Google Maps Platform** - For geocoding, place search, photos, and server-rendered static maps
2. **Google Places API** - For place search, details, and photos
3. **Google Gemini API** - For AI-powered place insights

### Getting API Keys

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Geocoding API
   - Maps Static API
   - Gemini API
4. Create a single server-side Google API key and keep it private on the server
5. Restrict the Google key by API and server environment as tightly as possible
6. Set `ALLOWED_ORIGINS` in production if your frontend is served from a different origin than the API server

## Setup

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd primeplaces
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your API keys:
   ```env
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

All keys are server-only. This app does not expose Google or Gemini keys to the browser.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start the development server
- `npm start` - Start the production server with the built frontend
- `npm run build` - Build the app for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run TypeScript type checking
