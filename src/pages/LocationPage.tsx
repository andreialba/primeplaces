import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { MapPin, Loader2, LayoutList, Map as MapIcon, Share2, Check } from 'lucide-react';
import clsx from 'clsx';
import PlaceCard from '../components/PlaceCard';
import AutocompleteSearch from '../components/AutocompleteSearch';
import MapView from '../components/MapView';
import PlaceDrawer from '../components/PlaceDrawer';

const TYPES = [
  { id: 'all', label: 'All Places' },
  { id: 'restaurant', label: 'Restaurants' },
  { id: 'cafe', label: 'Cafes' },
  { id: 'hotel', label: 'Hotels' },
  { id: 'bar', label: 'Bars' },
  { id: 'museum', label: 'Museums' },
  { id: 'tourist_attraction', label: 'Attractions' },
  { id: 'shopping_mall', label: 'Shopping' },
  { id: 'nature_recreation', label: 'Nature & Recreation' },
];

const SORTS = [
  { id: 'score', label: 'Best Overall' },
  { id: 'hidden_gems', label: 'Hidden Gems' },
  { id: 'reviews', label: 'Most Reviews' },
  { id: 'rating', label: 'Highest Rated' },
];

export default function LocationPage() {
  const { location, type = 'all', sort = 'score' } = useParams();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'list' | 'map'>('list');
  const [minRating, setMinRating] = useState(4.0);
  const [minReviews, setMinReviews] = useState(100);
  const [radius, setRadius] = useState(0);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);

  const formattedLocation = location ? location.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Location';
  const currentType = TYPES.find(t => t.id === type) || TYPES[0];
  const currentSort = SORTS.find(s => s.id === sort) || SORTS[0];

  const { data, isLoading, error } = useQuery({
    queryKey: ['places', location, type, radius],
    queryFn: async () => {
      const response = await axios.post('/api/places', {
        location: formattedLocation,
        type: currentType.label,
        typeId: currentType.id,
        radius,
      });
      setVisibleCount(10);
      return response.data;
    },
    enabled: !!location,
  });

  const allPlaces = data?.places || [];
  const center = data?.center || null;

  const filteredAndSortedPlaces = useMemo(() => {
    let result = [...allPlaces];

    // Apply filters
    if (sort === 'hidden_gems') {
      result = result.filter(p => {
        const rating = p.rating || 0;
        const reviews = p.userRatingCount || 0;
        return rating >= 4.5 && rating <= 5.0 && reviews < 1000;
      });
    } else {
      result = result.filter(p => 
        (p.rating || 0) >= minRating && 
        (p.userRatingCount || 0) >= minReviews
      );
    }

    // Apply sorting
    if (sort === 'reviews') {
      result.sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));
    } else if (sort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'score' || sort === 'hidden_gems') {
      result.sort((a, b) => {
        const scoreA = (a.rating || 0) * Math.log10(a.userRatingCount || 1);
        const scoreB = (b.rating || 0) * Math.log10(b.userRatingCount || 1);
        return scoreB - scoreA;
      });
    }

    return result;
  }, [allPlaces, sort, minRating, minReviews]);

  const isHiddenGems = sort === 'hidden_gems';

  const handleTypeChange = (newType: string) => {
    navigate(`/${location}/${newType}/${sort}`);
  };

  const handleSortChange = (newSort: string) => {
    navigate(`/${location}/${type}/${newSort}`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/share/${location}/${type}/${sort}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Helmet>
        <title>Top Rated {currentType.label} in {formattedLocation} | PrimePlaces</title>
        <meta name="description" content={`Discover the best ${currentType.label.toLowerCase()} in ${formattedLocation} based on real Google Maps reviews.`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": filteredAndSortedPlaces.slice(0, 10).map((place: any, index: number) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "LocalBusiness",
                "name": place.displayName?.text,
                "address": place.formattedAddress,
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": place.rating,
                  "reviewCount": place.userRatingCount
                }
              }
            })) || []
          })}
        </script>
      </Helmet>

      <div className="mb-12 border-b border-neutral-200 pb-8">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold text-neutral-900 mb-3 uppercase tracking-wider">Search another location</h2>
          <AutocompleteSearch 
            placeholder="Enter a location..."
            className="relative flex items-center bg-white border border-neutral-300 rounded-lg p-1"
            buttonClassName="bg-black hover:bg-neutral-800 text-white px-6 py-2 font-medium transition-colors flex items-center gap-2 rounded-md"
            iconClassName="w-5 h-5 text-neutral-400 mr-2"
            inputClassName="w-full py-2 text-base text-neutral-900 bg-transparent focus:outline-none placeholder-neutral-400"
          />
        </div>
      </div>

      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 tracking-tight mb-3">
            Best {currentType.label} in {formattedLocation}
          </h1>
          <p className="text-neutral-500 text-xl font-light">
            Ranked by {currentSort.label.toLowerCase()} from Google Maps data
          </p>
        </div>

        <div className="flex items-center gap-4 self-start md:self-auto">
          <button
            onClick={handleShare}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
              isCopied ? "bg-green-50 border-green-200 text-green-600" : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            )}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {isCopied ? 'Copied!' : 'Share List'}
          </button>

          <div className="flex bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => setView('list')}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                view === 'list' ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              <LayoutList className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setView('map')}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                view === 'map' ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0 space-y-10">
          <div>
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-widest mb-4">Category</h3>
            <div className="space-y-1">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
                  className={clsx(
                    "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors rounded-lg",
                    type === t.id ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-widest mb-4">Sort By</h3>
            <div className="space-y-1">
              {SORTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSortChange(s.id)}
                  className={clsx(
                    "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors rounded-lg",
                    sort === s.id ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className={clsx("space-y-10", isHiddenGems && "opacity-50 pointer-events-none")}>
            <div>
              <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-widest mb-4">Filters</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-neutral-900 mb-3 block">
                    Search Radius: <span className="text-neutral-500 font-normal">{radius === 0 ? 'Within the location' : `${radius} km`}</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" max="100" step="1" 
                    value={radius} 
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="w-full accent-black"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-900 mb-3 block">
                    Min Rating: <span className="text-neutral-500 font-normal">{minRating}+</span>
                  </label>
                  <input 
                    type="range" 
                    min="3.0" max="4.8" step="0.1" 
                    value={minRating} 
                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                    className="w-full accent-black"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-900 mb-3 block">Min Reviews</label>
                  <select 
                    value={minReviews} 
                    onChange={(e) => setMinReviews(parseInt(e.target.value))}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value={10}>10+ reviews</option>
                    <option value={50}>50+ reviews</option>
                    <option value={100}>100+ reviews</option>
                    <option value={500}>500+ reviews</option>
                    <option value={1000}>1000+ reviews</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
              <Loader2 className="w-10 h-10 animate-spin text-black mb-4" />
              <p className="text-lg font-medium">Finding the best places...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center">
              <p className="font-medium text-lg mb-2">Failed to load places</p>
              <p className="text-sm">Please make sure the Google Maps API key is configured correctly.</p>
            </div>
          ) : filteredAndSortedPlaces.length === 0 ? (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 p-16 text-center">
              <MapPin className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
              <p className="font-medium text-xl mb-2 text-neutral-900">No places found</p>
              <p className="text-neutral-500">Try adjusting your filters or searching for a different location.</p>
            </div>
          ) : view === 'map' ? (
            <MapView places={filteredAndSortedPlaces} center={center} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAndSortedPlaces.slice(0, visibleCount).map((place: any, index: number) => (
                  <PlaceCard 
                    key={place.id} 
                    place={place} 
                    rank={index + 1} 
                    location={formattedLocation}
                    type={currentType.label}
                    onClick={() => setSelectedPlace(place)}
                  />
                ))}
              </div>
              {filteredAndSortedPlaces && visibleCount < filteredAndSortedPlaces.length && (
                <div className="mt-10 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 px-8 py-3 rounded-lg font-medium transition-colors shadow-sm"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <PlaceDrawer 
        place={selectedPlace}
        isOpen={!!selectedPlace}
        onClose={() => setSelectedPlace(null)}
        location={formattedLocation}
        type={currentType.label}
      />
    </div>
  );
}
