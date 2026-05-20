import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import { MapPin, Navigation, Layers, Plus, Trash2, ShieldCheck, ShieldAlert, Crosshair, Droplets } from 'lucide-react';
import { WaterParameters } from '../utils/waterPredictor';
import { MockSample } from '../utils/mockData';
import { LocationSearch } from './LocationSearch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom colored marker icons using inline SVG
const createCustomIcon = (color: string, pulse: boolean = false) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        ${pulse ? `<div style="position: absolute; inset: -4px; background: ${color}; border-radius: 50%; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
        <div style="position: relative; width: 24px; height: 24px; background: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${color}, 0 2px 4px rgba(0,0,0,0.3);"></div>
      </div>
      <style>
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

const safeIcon = createCustomIcon('#00e5a0');
const unsafeIcon = createCustomIcon('#ff4d6d');
const selectedIcon = createCustomIcon('#00c6ff', true);

interface RealMapperProps {
  currentParameters: WaterParameters;
  wqi: number;
  isPotable: boolean;
  onLoadParameters: (params: WaterParameters, name: string) => void;
  savedSamples: MockSample[];
  onSaveSample: (sample: MockSample) => void;
  onDeleteSample: (id: string) => void;
  onLocationUpdate?: (location: [number, number] | null) => void;
}

// Component to handle map click events
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to center map on location
const LocationMarker: React.FC<{ position: [number, number] | null }> = ({ position }) => {
  const map = useMapEvents({});
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, 13);
    }
  }, [position, map]);
  
  return null;
};

export const RealMapper: React.FC<RealMapperProps> = ({
  currentParameters,
  wqi,
  isPotable,
  onLoadParameters,
  savedSamples,
  onSaveSample,
  onDeleteSample,
  onLocationUpdate
}) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [clickCoords, setClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [newCategory, setNewCategory] = useState<'tap' | 'spring' | 'industrial' | 'well' | 'runoff'>('tap');
  const [isLocating, setIsLocating] = useState(false);
  const [mapLayer, setMapLayer] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Get user's current location
  const getUserLocation = useCallback(() => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation: [number, number] = [latitude, longitude];
          setUserLocation(newLocation);
          onLocationUpdate?.(newLocation);
          setIsLocating(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Default to New York City if location fails
          const defaultLocation: [number, number] = [40.7128, -74.0060];
          setUserLocation(defaultLocation);
          onLocationUpdate?.(defaultLocation);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const defaultLocation: [number, number] = [40.7128, -74.0060];
      setUserLocation(defaultLocation);
      onLocationUpdate?.(defaultLocation);
      setIsLocating(false);
    }
  }, [onLocationUpdate]);

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const handleMapClick = (lat: number, lng: number) => {
    setClickCoords({ lat, lng });
  };

  const handleSavePin = () => {
    if (!clickCoords) return;
    if (!newLocationName.trim()) {
      alert('Please enter a location name');
      return;
    }

    const newSample: MockSample = {
      id: `sample-${Date.now()}`,
      name: newLocationName,
      category: newCategory,
      description: `Water sample collected at ${newLocationName}`,
      parameters: { ...currentParameters },
      coordinates: { ...clickCoords },
      locationName: newLocationName,
      dateCollected: new Date().toISOString().split('T')[0]
    };

    onSaveSample(newSample);
    setNewLocationName('');
    setClickCoords(null);
  };

  // Calculate heatmap circles based on WQI
  const getHeatmapRadius = (sample: MockSample) => {
    const failed = sample.parameters.ph < 6.5 || sample.parameters.ph > 8.5 || 
                   sample.parameters.solids > 1000 || sample.parameters.turbidity > 5;
    return failed ? 800 : 400;
  };

  const getHeatmapColor = (sample: MockSample) => {
    const failed = sample.parameters.ph < 6.5 || sample.parameters.ph > 8.5 || 
                   sample.parameters.solids > 1000 || sample.parameters.turbidity > 5;
    return failed ? '#ff4d6d' : '#00e5a0';
  };

  const defaultCenter: [number, number] = userLocation || [40.7128, -74.0060];

  return (
    <div className="bg-[#0a2235]/70 border border-blue-500/10 rounded-2xl p-6 relative overflow-hidden space-y-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full filter blur-xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-blue-500/10 pb-4 gap-4">
        <div>
          <h3 className="font-syne font-bold text-lg text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#00c6ff]" />
            Real-Time Water Reservoir Mapper
          </h3>
          <p className="text-xs text-slate-400">Interactive OpenStreetMap showing actual water bodies, reservoirs, and your sample locations.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={getUserLocation}
            disabled={isLocating}
            className="flex items-center gap-2 px-3 py-2 bg-[#020c14] border border-[#00c6ff]/30 text-[#00c6ff] rounded-lg text-xs font-syne font-bold hover:bg-[#00c6ff]/10 transition"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            {isLocating ? 'Locating...' : 'My Location'}
          </button>

          <div className="flex items-center gap-1 bg-[#020c14] border border-blue-500/15 rounded-lg px-2.5 py-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={mapLayer}
              onChange={(e) => setMapLayer(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 outline-none border-none cursor-pointer"
            >
              <option value="standard" className="bg-[#020c14]">Standard</option>
              <option value="satellite" className="bg-[#020c14]">Satellite</option>
              <option value="terrain" className="bg-[#020c14]">Terrain</option>
            </select>
          </div>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-syne font-bold transition ${
              showHeatmap 
                ? 'bg-[#ff4d6d]/20 text-[#ff4d6d] border border-[#ff4d6d]/30' 
                : 'bg-[#020c14] border border-blue-500/15 text-slate-400'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            Pollution Heatmap
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3 h-[500px] rounded-xl overflow-hidden border border-blue-500/20 relative">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', background: '#020c14' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={
                mapLayer === 'satellite' 
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : mapLayer === 'terrain'
                  ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
            />
            
            <MapClickHandler onMapClick={handleMapClick} />
            <LocationMarker position={userLocation} />

            {/* User location marker */}
            {userLocation && (
              <Marker position={userLocation} icon={selectedIcon}>
                <Popup>
                  <div className="text-xs font-syne">
                    <strong>Your Location</strong><br />
                    {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Clicked position marker */}
            {clickCoords && (
              <Marker position={[clickCoords.lat, clickCoords.lng]} icon={selectedIcon}>
                <Popup>
                  <div className="text-xs">
                    <strong>New Sample Location</strong><br />
                    Lat: {clickCoords.lat.toFixed(5)}<br />
                    Lng: {clickCoords.lng.toFixed(5)}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Saved sample markers */}
            {savedSamples.map((sample) => {
              const isSafe = sample.parameters.ph >= 6.5 && sample.parameters.ph <= 8.5 && 
                            sample.parameters.solids <= 1000 && sample.parameters.turbidity <= 5;
              return (
                <Marker
                  key={sample.id}
                  position={[sample.coordinates.lat, sample.coordinates.lng]}
                  icon={isSafe ? safeIcon : unsafeIcon}
                  eventHandlers={{
                    click: () => onLoadParameters(sample.parameters, sample.name),
                  }}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{sample.category === 'spring' ? '🏔️' : sample.category === 'tap' ? '💧' : sample.category === 'well' ? '🪨' : sample.category === 'industrial' ? '☣️' : '⛈️'}</span>
                        <strong className="font-syne text-sm">{sample.name}</strong>
                      </div>
                      <p className="text-xs text-slate-500">{sample.locationName}</p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>pH:</span>
                          <span className={sample.parameters.ph < 6.5 || sample.parameters.ph > 8.5 ? 'text-red-500' : 'text-green-500'}>{sample.parameters.ph}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TDS:</span>
                          <span className={sample.parameters.solids > 1000 ? 'text-red-500' : 'text-green-500'}>{sample.parameters.solids} ppm</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Turbidity:</span>
                          <span className={sample.parameters.turbidity > 5 ? 'text-red-500' : 'text-green-500'}>{sample.parameters.turbidity} NTU</span>
                        </div>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded ${isSafe ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isSafe ? '✓ Safe to Drink' : '⚠ Unsafe'}
                      </div>
                      <button
                        onClick={() => onDeleteSample(sample.id)}
                        className="w-full py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs mt-2"
                      >
                        Delete Sample
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Heatmap circles */}
            {showHeatmap && savedSamples.map((sample) => (
              <Circle
                key={`heatmap-${sample.id}`}
                center={[sample.coordinates.lat, sample.coordinates.lng]}
                radius={getHeatmapRadius(sample)}
                pathOptions={{
                  fillColor: getHeatmapColor(sample),
                  fillOpacity: 0.3,
                  color: getHeatmapColor(sample),
                  weight: 1,
                }}
              />
            ))}
          </MapContainer>

          {/* Map overlay instructions */}
          <div className="absolute bottom-4 left-4 z-[400] bg-[#061825]/95 border border-blue-500/20 backdrop-blur rounded-lg px-3 py-2 text-[10px] text-slate-300 max-w-[250px]">
            <p className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#00c6ff] rounded-full animate-pulse"></span>
              Click anywhere on the map to place a water sample pin
            </p>
          </div>
        </div>

          {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Location Search */}
          <LocationSearch 
            onLocationSelect={(lat, lon, name) => {
              setClickCoords({ lat, lng: lon });
              setNewLocationName(name);
            }}
            defaultQuery="Bengaluru"
          />

          {/* Sample Details Panel */}
          {clickCoords ? (
            <div className="bg-[#061825]/90 border border-blue-500/20 rounded-xl p-4 space-y-4 animate-[fadeIn_0.2s_ease]">
              <div className="flex items-center justify-between">
                <h4 className="font-syne font-bold text-xs text-[#00c6ff] uppercase tracking-wider">New Sample</h4>
                <button 
                  onClick={() => setClickCoords(null)}
                  className="text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-[#020c14] border border-blue-500/10 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Latitude</span>
                  <span className="text-slate-300 font-mono">{clickCoords.lat.toFixed(5)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Longitude</span>
                  <span className="text-slate-300 font-mono">{clickCoords.lng.toFixed(5)}°</span>
                </div>
              </div>

              <div className="p-3 bg-[#020c14] border border-blue-500/10 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-syne">Current WQI</span>
                  <span className="text-slate-300 font-bold font-mono">{wqi}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-syne">Status</span>
                  <span className={`font-bold uppercase tracking-wider ${isPotable ? 'text-[#00e5a0]' : 'text-[#ff4d6d]'}`}>
                    {isPotable ? 'Potable' : 'Unsafe'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">Location Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Central Park Reservoir" 
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="w-full bg-[#020c14] border border-blue-500/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00c6ff]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">Source Type</label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {(['tap', 'spring', 'well', 'industrial', 'runoff'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`px-2 py-1.5 rounded-lg capitalize border font-medium transition ${newCategory === cat ? 'bg-[#00c6ff]/15 border-[#00c6ff] text-[#00c6ff]' : 'bg-[#020c14] border-slate-800 text-slate-400 hover:border-slate-700'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSavePin}
                className="w-full py-2.5 bg-gradient-to-r from-[#0072ff] to-[#00c6ff] hover:from-[#00c6ff] hover:to-[#0072ff] rounded-lg text-xs font-syne font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-[#0072ff]/20 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5" />
                Pin to Map
              </button>
            </div>
          ) : (
            <div className="bg-[#061825]/60 border border-blue-500/10 rounded-xl p-6 text-center space-y-3">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
              <div>
                <h4 className="font-syne text-xs font-bold text-slate-300 uppercase tracking-wide">Click Map to Pin</h4>
                <p className="text-[10px] text-slate-500 mt-1">
                  Click anywhere on the real map to mark where you collected your water sample.
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="bg-[#061825]/60 border border-blue-500/10 rounded-xl p-4 space-y-3">
            <h4 className="font-syne text-xs font-bold text-slate-300 uppercase tracking-wide">Map Legend</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00e5a0] border-2 border-white shadow-[0_0_8px_#00e5a0]"></div>
                <span className="text-slate-400">Safe Water Sample</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff4d6d] border-2 border-white shadow-[0_0_8px_#ff4d6d]"></div>
                <span className="text-slate-400">Contaminated Sample</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00c6ff] border-2 border-white shadow-[0_0_8px_#00c6ff]"></div>
                <span className="text-slate-400">Your Location / Selected</span>
              </div>
            </div>
            <div className="pt-2 border-t border-blue-500/10">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Blue areas on the map indicate water bodies, reservoirs, and rivers. Look for these to find real sampling locations.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#061825]/60 border border-blue-500/10 rounded-xl p-4 space-y-2">
            <h4 className="font-syne text-xs font-bold text-slate-300 uppercase tracking-wide">Sample Registry</h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#020c14] rounded-lg p-2">
                <div className="text-lg font-syne font-bold text-[#00e5a0]">
                  {savedSamples.filter(s => s.parameters.ph >= 6.5 && s.parameters.ph <= 8.5 && s.parameters.solids <= 1000).length}
                </div>
                <div className="text-[9px] text-slate-500 uppercase">Safe</div>
              </div>
              <div className="bg-[#020c14] rounded-lg p-2">
                <div className="text-lg font-syne font-bold text-[#ff4d6d]">
                  {savedSamples.filter(s => s.parameters.ph < 6.5 || s.parameters.ph > 8.5 || s.parameters.solids > 1000).length}
                </div>
                <div className="text-[9px] text-slate-500 uppercase">Unsafe</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sample List Table */}
      <div className="border border-blue-500/10 rounded-xl bg-[#020c14] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-blue-500/10 text-slate-500 bg-[#061825]">
              <th className="p-3 font-syne uppercase font-bold tracking-wider">Status</th>
              <th className="p-3 font-syne uppercase font-bold tracking-wider">Sample</th>
              <th className="p-3 font-syne uppercase font-bold tracking-wider">Coordinates</th>
              <th className="p-3 font-syne uppercase font-bold tracking-wider">Location</th>
              <th className="p-3 font-syne uppercase font-bold tracking-wider">Critical Issues</th>
              <th className="p-3 text-right font-syne font-bold tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {savedSamples.map((sample) => {
              const isSafe = sample.parameters.ph >= 6.5 && sample.parameters.ph <= 8.5 && 
                            sample.parameters.solids <= 1000 && sample.parameters.turbidity <= 5;
              
              const issues: string[] = [];
              if (sample.parameters.ph < 6.5 || sample.parameters.ph > 8.5) issues.push('pH');
              if (sample.parameters.solids > 1000) issues.push('TDS');
              if (sample.parameters.turbidity > 5) issues.push('Turbidity');
              if (sample.parameters.sulfate > 250) issues.push('Sulfate');

              return (
                <tr key={sample.id} className="border-b border-blue-500/5 hover:bg-[#061825]/40 transition">
                  <td className="p-3">
                    {isSafe ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#00e5a0] bg-[#00e5a0]/10 border border-[#00e5a0]/20 px-2 py-0.5 rounded-full font-bold">
                        <ShieldCheck className="w-3 h-3" /> Safe
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#ff4d6d] bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 px-2 py-0.5 rounded-full font-bold">
                        <ShieldAlert className="w-3 h-3" /> Unsafe
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-bold text-slate-200">{sample.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{sample.category}</p>
                    </div>
                  </td>
                  <td className="p-3 text-slate-400 font-mono text-[10px]">
                    {sample.coordinates.lat.toFixed(4)}, {sample.coordinates.lng.toFixed(4)}
                  </td>
                  <td className="p-3 text-slate-400 text-[10px]">{sample.locationName}</td>
                  <td className="p-3">
                    {issues.length > 0 ? (
                      <span className="text-[#ff4d6d] text-[10px] font-bold">{issues.join(', ')}</span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">None</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => onLoadParameters(sample.parameters, sample.name)}
                        className="px-2.5 py-1 bg-[#00c6ff]/10 hover:bg-[#00c6ff]/20 text-[#00c6ff] rounded text-[10px] font-syne font-bold transition"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => onDeleteSample(sample.id)}
                        className="p-1 bg-red-500/10 hover:bg-red-500/25 text-[#ff4d6d] rounded border border-red-500/20 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {savedSamples.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                  No samples pinned yet. Click on the map to add your first water quality sample.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
