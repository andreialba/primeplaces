import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Loader2 } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

interface AutocompleteSearchProps {
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  inputClassName?: string;
}

export default function AutocompleteSearch({
  placeholder = "Enter a location (e.g., London, New York)...",
  className = "relative flex items-center bg-white overflow-hidden p-1",
  buttonClassName = "bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 font-medium transition-colors flex items-center gap-2",
  iconClassName = "w-6 h-6 text-neutral-400 mr-3",
  inputClassName = "w-full py-3 text-lg text-neutral-900 bg-transparent focus:outline-none placeholder-neutral-400"
}: AutocompleteSearchProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [sessionToken] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!query.trim() || query.trim().length < 3) {
        setPredictions([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await axios.get(`/api/autocomplete?q=${encodeURIComponent(query)}&sessiontoken=${sessionToken}`);
        setPredictions(res.data.predictions || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Failed to fetch predictions', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchPredictions, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (location: string) => {
    setQuery(location);
    setIsOpen(false);
    navigate(`/${location.toLowerCase().replace(/\s+/g, '-')}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (predictions.length > 0) {
      handleSelect(predictions[0].description);
    } else if (query.trim()) {
      handleSelect(query.trim());
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit} className={className}>
        <div className="flex-1 flex items-center px-4">
          <MapPin className={iconClassName} />
          <input
            type="text"
            placeholder={placeholder}
            className={inputClassName}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
          />
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />}
        </div>
        <button type="submit" className={buttonClassName}>
          <Search className="w-5 h-5" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {isOpen && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 shadow-lg z-50 max-h-60 overflow-y-auto">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 flex items-center gap-3"
              onClick={() => handleSelect(p.description)}
            >
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="text-neutral-700 truncate">{p.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
