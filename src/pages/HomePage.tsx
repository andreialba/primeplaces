import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import AutocompleteSearch from '../components/AutocompleteSearch';

export default function HomePage() {
  const navigate = useNavigate();

  const { data: trendingCities, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const res = await axios.get('/api/trending');
      return res.data as { name: string; image: string }[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      <Helmet>
        <title>PrimePlaces - Discover the Best Places</title>
        <meta name="description" content="Find the highest rated restaurants, cafes, hotels, and more in top cities worldwide based on real Google Maps reviews." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative bg-neutral-900 text-white py-32">
        <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/cityscape/1920/1080')] bg-cover bg-center mix-blend-overlay grayscale" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6 text-white max-w-3xl">
            Find top rated places around the world
          </h1>
          <p className="text-xl text-neutral-300 mb-12 max-w-2xl font-light">
            Discover top-rated restaurants, cafes, hotels, and attractions based on millions of real reviews from Google Maps.
          </p>
          
          <div className="max-w-2xl">
            <AutocompleteSearch 
              placeholder="Enter a location (e.g., London, New York)..."
              className="relative flex items-center bg-white p-2 rounded-lg"
              buttonClassName="bg-black hover:bg-neutral-800 text-white px-8 py-4 font-medium transition-colors flex items-center gap-2 rounded-md"
              iconClassName="w-6 h-6 text-neutral-900 mr-3"
              inputClassName="w-full py-3 text-lg text-neutral-900 bg-transparent focus:outline-none placeholder-neutral-500 font-medium"
            />
          </div>
        </div>
      </section>

      {/* Trending Locations */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex items-center gap-3">
          <div className="bg-neutral-100 p-3 rounded-full">
            <TrendingUp className="w-6 h-6 text-black" />
          </div>
          <h2 className="text-4xl font-semibold text-neutral-900 tracking-tight">
            Trending this week
          </h2>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-neutral-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingCities?.map((location) => (
              <button
                key={location.name}
                onClick={() => navigate(`/${location.name.toLowerCase().replace(/\s+/g, '-')}`)}
                className="group relative overflow-hidden aspect-[4/3] bg-neutral-100 rounded-xl transition-transform hover:scale-[1.02] duration-300"
              >
                <img 
                  src={location.image} 
                  alt={location.name} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 w-full flex justify-between items-end">
                  <h3 className="text-3xl font-semibold text-white tracking-tight">{location.name}</h3>
                  <div className="bg-white text-black p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}
