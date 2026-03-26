# Prime Places

Discover the most popular places from Google Maps data. Filter by location, sort by reviews, and find the best spots with AI-powered recommendations.

## Prerequisites

- Node.js (version 18 or higher)
- Google Cloud Console account for API keys

## Google APIs Required

This app uses the following Google APIs:

1. **Google Maps API** - For map rendering and geocoding
2. **Google Places API** - For place search, details, and photos
3. **Google Gemini API** - For AI-powered chatbot and image generation

### Getting API Keys

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Gemini API
4. Create API keys for each service
5. Restrict the keys to your domain for security (optional but recommended)

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
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the app for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run TypeScript type checking
