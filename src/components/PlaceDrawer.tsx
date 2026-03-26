import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, MapPin, ArrowUpRight, Loader2, Sparkles, Image as ImageIcon, ChevronLeft, ChevronRight, Users, Zap, AlertCircle, Clock, Banknote, Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface AISummaryData {
  summary: string;
  vibe: string;
  insights: {
    label: string;
    value: string;
    icon: string;
  }[];
}

interface PlaceDrawerProps {
  place: any | null;
  isOpen: boolean;
  onClose: () => void;
  location: string;
  type: string;
}

export default function PlaceDrawer({ place, isOpen, onClose, location, type }: PlaceDrawerProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCurrentPhotoIndex(0);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const nextPhoto = () => {
    if (!place?.photos) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % Math.min(place.photos.length, 5));
  };

  const prevPhoto = () => {
    if (!place?.photos) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + Math.min(place.photos.length, 5)) % Math.min(place.photos.length, 5));
  };

  const { data: aiSummary, isLoading: isSummaryLoading, error: summaryError } = useQuery({
    queryKey: ['ai-summary-v3', place?.displayName?.text, location, type],
    queryFn: async () => {
      if (!place) return null;
      try {
        const res = await axios.post('/api/ai/summary', {
          placeName: place.displayName?.text,
          location,
          type,
        });
        return res.data.summary as AISummaryData;
      } catch (err: any) {
        throw new Error(err.response?.data?.error || 'Failed to generate summary');
      }
    },
    enabled: !!place && isOpen,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: false,
  });

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'users': return <Users className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />;
      case 'heart': return <Heart className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />;
      case 'alert': return <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />;
      case 'clock': return <Clock className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />;
      case 'banknote': return <Banknote className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />;
      case 'map': return <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />;
      case 'zap': return <Zap className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />;
      case 'coffee': return <Sparkles className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />; // Fallback or coffee icon if available
      case 'bed': return <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />; // Fallback
      default: return <Sparkles className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />;
    }
  };

  if (!place) return null;

  const getRatingColor = (rating: number | undefined) => {
    if (!rating) return 'bg-neutral-100 text-neutral-600';
    return 'bg-neutral-900 text-white';
  };

  const priceLevelMap: Record<string, string> = {
    PRICE_LEVEL_INEXPENSIVE: '$',
    PRICE_LEVEL_MODERATE: '$$',
    PRICE_LEVEL_EXPENSIVE: '$$$',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
  };

  const priceString = place.priceLevel ? priceLevelMap[place.priceLevel] : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text + ' ' + place.formattedAddress)}&query_place_id=${place.id}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header / Close Button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={onClose}
                className="bg-black/50 hover:bg-black/70 backdrop-blur-md text-white p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-24">
              {/* Photo Gallery Header */}
              <div className="relative h-72 bg-neutral-900 group">
                {place.photos && place.photos.length > 0 ? (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentPhotoIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        src={`/api/photo/${place.photos[currentPhotoIndex].name}`}
                        alt={`${place.displayName?.text} - Photo ${currentPhotoIndex + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${place.id}-${currentPhotoIndex}/800/600`;
                        }}
                      />
                    </AnimatePresence>

                    {/* Navigation Arrows */}
                    {place.photos.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 bg-neutral-100">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                    <p>No photos available</p>
                  </div>
                )}
                
                {/* Photo indicator dots */}
                {place.photos && place.photos.length > 1 && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {place.photos.slice(0, 5).map((_: any, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(idx); }}
                        className={`h-1.5 rounded-full transition-all ${idx === currentPhotoIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5 hover:bg-white/80'}`} 
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Title & Meta */}
                <div className="mb-6">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h2 className="text-2xl font-bold text-neutral-900 leading-tight">
                      {place.displayName?.text}
                    </h2>
                    <div className="flex flex-col items-end shrink-0">
                      <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded mb-1 ${getRatingColor(place.rating)}`}>
                        <Star className="w-3 h-3 fill-current" />
                        <span className="font-bold text-sm">{place.rating?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <span className="text-xs text-neutral-500 font-medium">
                        {place.userRatingCount?.toLocaleString() || 0} reviews
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {priceString && (
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {priceString}
                      </span>
                    )}
                    {place.types?.slice(0, 3).map((t: string) => (
                      <span key={t} className="text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded capitalize">
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Summary */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4 text-neutral-900 font-semibold">
                    <h3 className="text-xs uppercase tracking-widest">Insights</h3>
                  </div>
                  
                  {isSummaryLoading ? (
                    <div className="flex items-center gap-3 text-neutral-400 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">Generating...</span>
                    </div>
                  ) : summaryError ? (
                    <p className="text-red-500 text-xs leading-relaxed">
                      {(summaryError as Error).message}
                    </p>
                  ) : aiSummary ? (
                    <div className="space-y-5">
                      <p className="text-neutral-600 text-sm leading-relaxed">
                        {aiSummary.summary}
                      </p>

                      <div className="space-y-4">
                        {/* Vibe Tags */}
                        {aiSummary.vibe && (
                          <div className="flex flex-wrap gap-1.5">
                            {aiSummary.vibe.split('·').map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-neutral-100 rounded text-[11px] font-medium text-neutral-500">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Structured Fields */}
                        <div className="grid grid-cols-1 gap-4">
                          {aiSummary.insights?.length > 0 ? (
                            aiSummary.insights.map((insight, idx) => {
                              const isSpecial = insight.label.toLowerCase().includes('time') || insight.label.toLowerCase().includes('price');
                              return (
                                <div key={idx} className={`flex gap-3 ${isSpecial ? 'pt-2 border-t border-neutral-100' : ''}`}>
                                  {getIcon(insight.icon)}
                                  <div>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">{insight.label}</p>
                                    <p className={`${isSpecial ? 'text-sm' : 'text-sm'} text-neutral-700 font-medium`}>
                                      {insight.value}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-neutral-400 text-xs italic">No specific insights available for this location.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-400 text-xs italic">Insights unavailable.</p>
                  )}
                </div>

                {/* Location Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900">Location</h3>
                  <div className="flex items-start gap-3 text-neutral-600 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                    <MapPin className="w-5 h-5 shrink-0 text-neutral-400 mt-0.5" />
                    <span className="text-sm leading-relaxed">{place.formattedAddress}</span>
                  </div>
                  
                  {/* Static Map Image */}
                  {place.location && (
                    <div className="w-full h-32 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 relative">
                      <img 
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${place.location.latitude},${place.location.longitude}&zoom=15&size=600x300&markers=color:red%7C${place.location.latitude},${place.location.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`}
                        alt="Map location"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-black text-white font-semibold rounded-xl hover:bg-neutral-800 transition-colors shadow-md hover:shadow-lg"
              >
                Open in Google Maps
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
