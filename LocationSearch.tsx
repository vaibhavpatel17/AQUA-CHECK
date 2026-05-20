import React, { useState, useCallback } from 'react';
import { Search, MapPin, Loader2, Navigation } from 'lucide-react';

interface LocationResult {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
}

interface LocationSearchProps {
  onLocationSelect: (lat: number, lon: number, name: string) => void;
  defaultQuery?: string;
}

// Major Indian cities with approximate coordinates for quick select
const INDIAN_CITIES = [
  { name: 'Bengaluru (Bangalore)', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
  { name: 'Delhi', lat: 28.6139, lon: 77.2090, state: 'Delhi' },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, state: 'Telangana' },
  { name: 'Pune', lat: 18.5204, lon: 73.8567, state: 'Maharashtra' },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, state: 'Gujarat' },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873, state: 'Rajasthan' },
  { name: 'Lucknow', lat: 26.8467, lon: 80.9462, state: 'Uttar Pradesh' },
];

export const LocationSearch: React.FC<LocationSearchProps> = ({ 
  onLocationSelect,
  defaultQuery = ''
}) => {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showIndianCities, setShowIndianCities] = useState(true);

  const searchLocation = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setShowIndianCities(false);
    
    try {
      // Use Nominatim (OpenStreetMap) geocoding API
      // Note: In production, should use a proper geocoding service with API key
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      
      const data = await response.json();
      
      const locations: LocationResult[] = data.map((item: any) => ({
        name: item.name || item.display_name.split(',')[0],
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type,
      }));
      
      setResults(locations);
    } catch (error) {
      console.error('Geocoding error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchLocation(query);
  };

  const handleSelect = (location: LocationResult | typeof INDIAN_CITIES[0]) => {
    onLocationSelect(location.lat, location.lon, location.name);
    setResults([]);
    setShowIndianCities(false);
  };

  return (
    <div className="bg-[#061825]/80 border border-blue-500/20 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Navigation className="w-4 h-4 text-[#00c6ff]" />
        <h4 className="font-syne font-bold text-xs text-[#00c6ff] uppercase tracking-wider">
          Global Location Search
        </h4>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city, lake, or reservoir..."
          className="w-full bg-[#020c14] border border-blue-500/15 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-[#00c6ff] placeholder:text-slate-600"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#00c6ff]/10 hover:bg-[#00c6ff]/20 text-[#00c6ff] rounded text-[10px] font-bold transition disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Indian Cities Quick Select */}
      {showIndianCities && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            Popular Indian Cities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {INDIAN_CITIES.map((city) => (
              <button
                key={city.name}
                onClick={() => handleSelect(city)}
                className="px-2.5 py-1 bg-[#020c14] hover:bg-[#00c6ff]/10 border border-slate-800 hover:border-[#00c6ff]/30 rounded-lg text-[10px] text-slate-300 hover:text-[#00c6ff] transition"
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            Search Results
          </p>
          <div className="max-h-[150px] overflow-y-auto space-y-1">
            {results.map((result, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(result)}
                className="w-full text-left p-2.5 rounded-lg bg-[#020c14] hover:bg-[#00c6ff]/10 border border-transparent hover:border-[#00c6ff]/20 transition group"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#00c6ff] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-1">
                      {result.name}
                    </p>
                    <p className="text-[9px] text-slate-500 line-clamp-1">
                      {result.displayName}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No USGS notice for India */}
      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
        <p className="text-[9px] text-amber-400/80 leading-relaxed">
          <strong>Note:</strong> Real-time USGS sensor data is only available for U.S. locations. 
          For India and other regions, use the water quality presets or manual entry based on local lab reports.
        </p>
      </div>
    </div>
  );
};
