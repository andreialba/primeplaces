import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { Loader2, MapPin, Star, ExternalLink, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

const TYPES: Record<string, string> = {
  all: 'Places',
  restaurant: 'Restaurants',
  cafe: 'Cafes',
  hotel: 'Hotels',
  bar: 'Bars',
  museum: 'Museums',
  tourist_attraction: 'Attractions',
  shopping_mall: 'Shopping',
  nature_recreation: 'Nature & Recreation',
};

const SORTS: Record<string, string> = {
  score: 'Best Overall',
  hidden_gems: 'Hidden Gems',
  reviews: 'Most Reviews',
  rating: 'Highest Rated',
};

export default function SharePage() {
  const { location, type = 'all', sort = 'score' } = useParams();
  
  const formattedLocation = location ? location.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Location';
  const typeLabel = TYPES[type] || 'Places';
  const sortLabel = SORTS[sort] || 'Top Rated';

  const { data, isLoading } = useQuery({
    queryKey: ['places', location, type, sort, 'shared'],
    queryFn: async () => {
      const response = await axios.post('/api/places', {
        location: formattedLocation,
        type: typeLabel,
        typeId: type,
      });
      
      let places = response.data.places || [];
      
      // Apply the same sort/filter as the main page for consistency
      if (sort === 'hidden_gems') {
        places = places.filter((p: any) => {
          const rating = p.rating || 0;
          const reviews = p.userRatingCount || 0;
          return rating >= 4.5 && rating <= 5.0 && reviews < 1000;
        });
      }

      if (sort === 'reviews') {
        places.sort((a: any, b: any) => (b.userRatingCount || 0) - (a.userRatingCount || 0));
      } else if (sort === 'rating') {
        places.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
      } else {
        places.sort((a: any, b: any) => {
          const scoreA = (a.rating || 0) * Math.log10(a.userRatingCount || 1);
          const scoreB = (b.rating || 0) * Math.log10(b.userRatingCount || 1);
          return scoreB - scoreA;
        });
      }

      return places.slice(0, 10); // Top 10 for the shared list
    },
    enabled: !!location,
  });

  const ogImageUrl = `/api/location-photo/${location}`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-neutral-50"
    >
      <Helmet>
        <title>Top 10 {typeLabel} in {formattedLocation} | PrimePlaces</title>
        <meta name="description" content={`The curated list of the best ${typeLabel.toLowerCase()} in ${formattedLocation}.`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Top 10 ${typeLabel} in ${formattedLocation}`} />
        <meta property="og:description" content={`Check out this ranked list of the best ${typeLabel.toLowerCase()} in ${formattedLocation}.`} />
        <meta property="og:image" content={ogImageUrl} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`Top 10 ${typeLabel} in ${formattedLocation}`} />
        <meta property="twitter:description" content={`Check out this ranked list of the best ${typeLabel.toLowerCase()} in ${formattedLocation}.`} />
        <meta property="twitter:image" content={ogImageUrl} />
      </Helmet>

      {/* Header */}
      <div className="relative h-[40vh] min-h-[300px] bg-neutral-900 overflow-hidden">
        <img 
          src={ogImageUrl} 
          alt={formattedLocation}
          className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale-[0.5]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <Link to={`/${location}/${type}/${sort}`} className="mb-8 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to full interactive list
          </Link>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Top 10 {typeLabel}
          </h1>
          <p className="text-xl md:text-2xl text-white/80 font-light max-w-2xl">
            The definitive ranked list for {formattedLocation}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            {sortLabel}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Generating your curated list...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {data?.map((place: any, index: number) => (
              <motion.div 
                key={place.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="relative w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-neutral-100">
                  {place.photos?.[0] ? (
                    <img 
                      src={`/api/photo/${place.photos[0].name}`} 
                      alt={place.displayName?.text}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <MapPin className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                    {index + 1}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold">{place.rating}</span>
                      </div>
                      <span className="text-neutral-400 text-sm">({place.userRatingCount.toLocaleString()} reviews)</span>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">{place.displayName?.text}</h3>
                    <p className="text-neutral-500 text-sm line-clamp-2 mb-4">{place.formattedAddress}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex gap-1">
                      {place.types?.slice(0, 2).map((t: string) => (
                        <span key={t} className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 bg-neutral-100 px-2 py-1 rounded">
                          {t.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text + ' ' + place.formattedAddress)}&query_place_id=${place.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black hover:text-neutral-600 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="pt-12 text-center border-t border-neutral-200">
              <p className="text-neutral-500 mb-6">Want to explore more places in {formattedLocation}?</p>
              <Link 
                to={`/${location}/${type}/${sort}`}
                className="inline-flex items-center gap-2 bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-neutral-800 transition-colors"
              >
                Explore Interactive List
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
