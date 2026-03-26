import React from 'react';
import { Star, MapPin, ArrowUpRight, Gem } from 'lucide-react';
import { motion } from 'motion/react';

interface PlaceCardProps {
  key?: React.Key;
  place: any;
  rank: number;
  location: string;
  type: string;
  onClick?: () => void;
}

export default function PlaceCard({ place, rank, location, type, onClick }: PlaceCardProps) {
  const getRatingColor = (rating: number | undefined) => {
    if (!rating) return 'bg-neutral-100 text-neutral-600';
    return 'bg-neutral-900 text-white';
  };

  const photoUrl = place.photos?.[0]?.name 
    ? `/api/photo/${place.photos[0].name}`
    : `https://picsum.photos/seed/${place.id}/400/300`;

  const isHiddenGem = (place.rating >= 4.5 && place.rating <= 5.0) && (place.userRatingCount < 1000);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      onClick={onClick}
      className="bg-white flex flex-col h-full group rounded-2xl overflow-hidden border border-neutral-200 hover:border-neutral-300 transition-colors shadow-sm hover:shadow-md cursor-pointer"
    >
      <div className="relative h-56 bg-neutral-100 overflow-hidden">
        <img 
          src={photoUrl} 
          alt={place.displayName?.text} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${place.id}/400/300`;
          }}
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="bg-white text-black px-3 py-1 rounded-full font-semibold text-sm shadow-sm">
            #{rank}
          </div>
          {isHiddenGem && (
            <div className="bg-emerald-500 text-white px-3 py-1 rounded-full font-semibold text-xs shadow-sm flex items-center gap-1">
              <Gem className="w-3 h-3" />
              Hidden Gem
            </div>
          )}
        </div>
        {place.priceLevel && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium">
            {'$'.repeat(place.priceLevel === 'PRICE_LEVEL_INEXPENSIVE' ? 1 : place.priceLevel === 'PRICE_LEVEL_MODERATE' ? 2 : place.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ? 3 : 4)}
          </div>
        )}
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2 gap-4">
          <h3 className="text-xl font-semibold text-neutral-900 line-clamp-1 group-hover:text-black transition-colors">
            {place.displayName?.text}
          </h3>
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded shrink-0 ${getRatingColor(place.rating)}`}>
            <Star className="w-3 h-3 fill-current" />
            <span className="font-bold text-xs">{place.rating?.toFixed(1) || 'N/A'}</span>
          </div>
        </div>
        
        <div className="text-neutral-500 text-sm mb-4">
          {place.userRatingCount?.toLocaleString() || 0} reviews
        </div>
        
        <div className="flex items-start gap-2 text-neutral-600 text-sm mb-6 flex-1">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-neutral-400" />
          <span className="line-clamp-2">{place.formattedAddress}</span>
        </div>
        
        <div className="mt-auto pt-4 flex gap-2">
          <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-100 text-neutral-900 text-sm font-semibold rounded-xl group-hover:bg-neutral-200 transition-colors">
            View Details
          </div>
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text + ' ' + place.formattedAddress)}&query_place_id=${place.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white border border-neutral-200 text-neutral-900 text-sm font-semibold rounded-xl hover:bg-neutral-50 transition-colors shadow-sm"
          >
            Google Maps
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
