import React, { useState, useEffect } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow,
  useAdvancedMarkerRef,
  useMap
} from '@vis.gl/react-google-maps';
import { Star, ExternalLink } from 'lucide-react';

interface MapViewProps {
  places: any[];
  center: { latitude: number; longitude: number } | null;
}

interface MarkerWithInfoWindowProps {
  place: any;
  rank: number;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  key?: React.Key;
}

const MarkerWithInfoWindow = ({ 
  place, 
  rank, 
  isOpen, 
  onOpen, 
  onClose 
}: MarkerWithInfoWindowProps) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  if (!place.location || typeof place.location.latitude !== 'number' || typeof place.location.longitude !== 'number') {
    return null;
  }

  const position = {
    lat: place.location.latitude,
    lng: place.location.longitude
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text + ' ' + place.formattedAddress)}&query_place_id=${place.id}`;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={onOpen}
        title={place.displayName?.text}
      >
        <Pin background={'#000'} glyphColor={'#fff'} borderColor={'#000'}>
          <span className="text-[10px] font-bold text-white">#{rank}</span>
        </Pin>
      </AdvancedMarker>

      {isOpen && (
        <InfoWindow
          anchor={marker}
          onCloseClick={onClose}
        >
          <div className="p-2 max-w-[220px]">
            <a 
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-1.5 mb-1.5"
            >
              <h4 className="font-semibold text-neutral-900 text-sm leading-tight group-hover:text-neutral-600 transition-colors">
                {place.displayName?.text}
              </h4>
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-neutral-400 group-hover:text-neutral-600" />
            </a>
            <div className="flex items-center gap-1 mb-1.5">
              <Star className="w-3 h-3 fill-neutral-900 text-neutral-900" />
              <span className="text-xs font-medium">{place.rating}</span>
              <span className="text-neutral-500 text-[10px]">({place.userRatingCount})</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              {place.formattedAddress}
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export default function MapView({ places, center }: MapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [openId, setOpenId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    const isValidCoordinate = (val: any) => typeof val === 'number' && !isNaN(val);
    
    if (center && isValidCoordinate(center.latitude) && isValidCoordinate(center.longitude)) {
      setMapCenter({ lat: center.latitude, lng: center.longitude });
      setZoom(13);
    } else if (places.length > 0 && places[0].location && isValidCoordinate(places[0].location.latitude) && isValidCoordinate(places[0].location.longitude)) {
      setMapCenter({ lat: places[0].location.latitude, lng: places[0].location.longitude });
      setZoom(13);
    }
  }, [center, places]);

  if (!apiKey) {
    return (
      <div className="bg-neutral-100 rounded-2xl h-[600px] flex items-center justify-center text-neutral-500">
        <p>Google Maps API Key not configured for client-side maps.</p>
      </div>
    );
  }

  const handleMarkerClick = (place: any) => {
    setOpenId(place.id);
    setMapCenter({
      lat: place.location.latitude,
      lng: place.location.longitude
    });
  };

  return (
    <div className="h-[700px] rounded-2xl overflow-hidden border border-neutral-200 shadow-sm">
      <APIProvider apiKey={apiKey}>
        <Map
          center={mapCenter}
          onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
          zoom={zoom}
          onZoomChanged={(ev) => setZoom(ev.detail.zoom)}
          mapId="bf51a910020fa25a"
          gestureHandling={'greedy'}
          disableDefaultUI={false}
          scrollwheel={true}
        >
          {places.map((place, index) => (
            <MarkerWithInfoWindow 
              key={place.id} 
              place={place} 
              rank={index + 1}
              isOpen={openId === place.id}
              onOpen={() => handleMarkerClick(place)}
              onClose={() => setOpenId(null)}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
