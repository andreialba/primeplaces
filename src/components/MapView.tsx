import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, MapPin, Star } from 'lucide-react';

interface MapViewProps {
  places: any[];
  center: { latitude: number; longitude: number } | null;
}

export default function MapView({ places, center }: MapViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });

  useEffect(() => {
    const isValidCoordinate = (val: any) => typeof val === 'number' && !isNaN(val);
    
    if (center && isValidCoordinate(center.latitude) && isValidCoordinate(center.longitude)) {
      setMapCenter({ lat: center.latitude, lng: center.longitude });
    } else if (places.length > 0 && places[0].location && isValidCoordinate(places[0].location.latitude) && isValidCoordinate(places[0].location.longitude)) {
      setMapCenter({ lat: places[0].location.latitude, lng: places[0].location.longitude });
    }
  }, [center, places]);

  useEffect(() => {
    if (!selectedId && places.length > 0) {
      setSelectedId(places[0].id);
    }
  }, [places, selectedId]);

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedId) || places[0],
    [places, selectedId]
  );

  const markers = useMemo(
    () =>
      places
        .filter((place) => place.location)
        .slice(0, 10)
        .map((place, index) => ({
          lat: place.location.latitude,
          lng: place.location.longitude,
          label: String((index + 1) % 10),
        })),
    [places]
  );

  const mapUrl = `/api/static-map?centerLat=${mapCenter.lat}&centerLng=${mapCenter.lng}&zoom=13&width=1200&height=700&scale=2&markers=${encodeURIComponent(JSON.stringify(markers))}`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_380px] gap-6">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm bg-white">
        <img
          src={mapUrl}
          alt="Map of selected places"
          className="block w-full h-[700px] object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-900">Mapped Places</h3>
          <p className="text-sm text-neutral-500">All map images are rendered through the server, so no API keys are exposed in the browser.</p>
        </div>

        <div className="max-h-[700px] overflow-y-auto">
          {places.map((place, index) => {
            const isSelected = selectedPlace?.id === place.id;
            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text + ' ' + place.formattedAddress)}&query_place_id=${place.id}`;

            return (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  setSelectedId(place.id);
                  if (place.location) {
                    setMapCenter({
                      lat: place.location.latitude,
                      lng: place.location.longitude,
                    });
                  }
                }}
                className={`w-full text-left px-5 py-4 border-b border-neutral-100 transition-colors ${isSelected ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-1.5 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <h4 className="font-semibold text-neutral-900 truncate">{place.displayName?.text}</h4>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-neutral-600 mb-2">
                      <Star className="w-4 h-4 fill-neutral-900 text-neutral-900" />
                      <span>{place.rating ?? 'N/A'}</span>
                      <span className="text-neutral-400">({place.userRatingCount ?? 0})</span>
                    </div>
                    <p className="text-sm text-neutral-500 line-clamp-2">{place.formattedAddress}</p>
                  </div>

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-white"
                  >
                    Open
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {isSelected && place.location && (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-neutral-500">
                    <MapPin className="w-4 h-4" />
                    Focused on this place in the map preview
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
