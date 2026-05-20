import React, { useState, useRef } from 'react';
import { MapPin, Navigation, Layers, Plus, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { WaterParameters } from '../utils/waterPredictor';
import { MockSample } from '../utils/mockData';

interface MapperProps {
  currentParameters: WaterParameters;
  wqi: number;
  isPotable: boolean;
  onLoadParameters: (params: WaterParameters, name: string) => void;
  savedSamples: MockSample[];
  onSaveSample: (sample: MockSample) => void;
  onDeleteSample: (id: string) => void;
}

// Convert coordinates to map SVG coordinates
// NY Region rough box: Lat [40.55, 40.90], Lng [-74.20, -73.80]
const mapBounds = {
  minLat: 40.55,
  maxLat: 40.90,
  minLng: -74.20,
  maxLng: -73.80
};

export const SampleMapper: React.FC<MapperProps> = ({
  currentParameters,
  wqi,
  isPotable,
  onLoadParameters,
  savedSamples,
  onSaveSample,
  onDeleteSample
}) => {
  const [heatmapMetric, setHeatmapMetric] = useState<'wqi' | 'solids' | 'sulfate' | 'chloramines' | 'none'>('none');
  const [clickCoords, setClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [newCategory, setNewCategory] = useState<'tap' | 'spring' | 'industrial' | 'well' | 'runoff'>('tap');
  const [hoveredSample, setHoveredSample] = useState<MockSample | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');

  const svgRef = useRef<SVGSVGElement>(null);

  // Convert Lat/Lng to SVG X/Y (User space: 800 x 500)
  const getXY = (lat: number, lng: number) => {
    const latSpan = mapBounds.maxLat - mapBounds.minLat;
    const lngSpan = mapBounds.maxLng - mapBounds.minLng;
    
    // Y goes from top to bottom, so lat (which increases upwards) is inverted
    const xVal = ((lng - mapBounds.minLng) / lngSpan) * 800;
    const yVal = (1 - (lat - mapBounds.minLat) / latSpan) * 500;
    
    return { 
      x: xVal, 
      y: yVal,
      xNum: xVal,
      yNum: yVal
    };
  };

  // Convert SVG click X/Y to Lat/Lng
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const xRatio = clickX / rect.width;
    const yRatio = clickY / rect.height;
    
    const latSpan = mapBounds.maxLat - mapBounds.minLat;
    const lngSpan = mapBounds.maxLng - mapBounds.minLng;
    
    const lng = mapBounds.minLng + xRatio * lngSpan;
    const lat = mapBounds.maxLat - yRatio * latSpan; // invert
    
    setClickCoords({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    });
  };

  // Handle saving the current sample
  const handleSavePin = () => {
    if (!clickCoords) return;
    if (!newLocationName.trim()) {
      alert("Please enter a location name for this water sample.");
      return;
    }

    const newSample: MockSample = {
      id: `sample-${Date.now()}`,
      name: newLocationName,
      category: newCategory,
      description: `User-analyzed water sample from ${newLocationName}.`,
      parameters: { ...currentParameters },
      coordinates: { ...clickCoords },
      locationName: newLocationName,
      dateCollected: new Date().toISOString().split('T')[0]
    };

    onSaveSample(newSample);
    setNewLocationName('');
    setClickCoords(null);
  };

  // Pre-load parameters into input form
  const handleSelectSample = (sample: MockSample) => {
    onLoadParameters(sample.parameters, sample.name);
  };

  return (
    <div className="bg-[#0a2235]/70 border border-blue-500/10 rounded-2xl p-6 relative overflow-hidden space-y-6">
      {/* Background orbs */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full filter blur-xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-blue-500/10 pb-4 gap-4">
        <div>
          <h3 className="font-syne font-bold text-lg text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#00c6ff] rotate-45" />
            Sample Location Mapper
          </h3>
          <p className="text-xs text-slate-400">Pin analysis results to map locations to track pollution density over time.</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-[#020c14] border border-blue-500/15 rounded-lg p-0.5">
            <button 
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold font-syne transition ${activeTab === 'map' ? 'bg-[#00c6ff]/15 text-[#00c6ff]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Interactive Map
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold font-syne transition ${activeTab === 'list' ? 'bg-[#00c6ff]/15 text-[#00c6ff]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Saved Samples ({savedSamples.length})
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#020c14] border border-blue-500/15 rounded-lg px-2.5 py-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={heatmapMetric}
              onChange={(e) => setHeatmapMetric(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 outline-none border-none cursor-pointer"
            >
              <option value="none" className="bg-[#020c14]">No Heatmap</option>
              <option value="wqi" className="bg-[#020c14]">WQI Heatmap</option>
              <option value="solids" className="bg-[#020c14]">TDS (Solids) Heatmap</option>
              <option value="sulfate" className="bg-[#020c14]">Sulfate Heatmap</option>
              <option value="chloramines" className="bg-[#020c14]">Chloramine Heatmap</option>
            </select>
          </div>
        </div>
      </div>

      {activeTab === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAP CANVAS */}
          <div className="lg:col-span-2 relative bg-[#020c14] border border-blue-500/10 rounded-xl overflow-hidden aspect-[8/5] select-none shadow-inner">
            {/* Grid Line background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,198,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,198,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

            {/* Map Vector Art */}
            <svg 
              ref={svgRef}
              onClick={handleMapClick}
              className="w-full h-full cursor-crosshair relative z-10"
              viewBox="0 0 800 500"
            >
              {/* Rivers / Reservoirs */}
              <path 
                d="M -10,350 Q 150,300 250,220 T 450,150 T 650,200 T 810,180" 
                fill="none" 
                stroke="rgba(0, 114, 255, 0.25)" 
                strokeWidth="28" 
                strokeLinecap="round"
                className="transition-all"
              />
              <path 
                d="M -10,350 Q 150,300 250,220 T 450,150 T 650,200 T 810,180" 
                fill="none" 
                stroke="rgba(0, 198, 255, 0.4)" 
                strokeWidth="12" 
                strokeLinecap="round"
              />
              {/* Mountain Lake Reservoir */}
              <circle cx="250" cy="220" r="45" fill="rgba(0, 114, 255, 0.2)" stroke="rgba(0, 198, 255, 0.3)" strokeWidth="2" />
              <text x="250" y="225" fill="rgba(0, 198, 255, 0.7)" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-syne tracking-wider pointer-events-none">RESERVOIR</text>

              {/* Industrial Zone Outline */}
              <rect x="580" y="50" width="180" height="110" rx="10" fill="rgba(255, 77, 109, 0.03)" stroke="rgba(255, 77, 109, 0.15)" strokeWidth="1" strokeDasharray="4,4" />
              <text x="670" y="110" fill="rgba(255, 77, 109, 0.4)" fontSize="9" fontWeight="bold" textAnchor="middle" className="font-syne tracking-wider pointer-events-none">INDUSTRIAL SECTOR</text>

              {/* Residential Zone */}
              <rect x="50" y="60" width="140" height="120" rx="8" fill="rgba(0, 229, 160, 0.02)" stroke="rgba(0, 229, 160, 0.1)" strokeWidth="1" strokeDasharray="3,3" />
              <text x="120" y="125" fill="rgba(0, 229, 160, 0.3)" fontSize="9" fontWeight="bold" textAnchor="middle" className="font-syne tracking-wider pointer-events-none">RESIDENTIAL DISTRICT</text>

              {/* Heatmap overlay markers (rendered as glowing radials) */}
              {heatmapMetric !== 'none' && savedSamples.map((sample) => {
                const { x, y } = getXY(sample.coordinates.lat, sample.coordinates.lng);
                
                // Heatmap logic: calculate size & color based on metric
                let size = 30;
                let color = "rgba(0, 229, 160, 0.35)"; // green safe default
                
                if (heatmapMetric === 'wqi') {
                  // Evaluate safety
                  const failed = sample.parameters.ph < 6.5 || sample.parameters.ph > 8.5 || sample.parameters.solids > 1000 || sample.parameters.turbidity > 5.0;
                  color = failed ? "rgba(255, 77, 109, 0.45)" : "rgba(0, 229, 160, 0.45)";
                  size = failed ? 80 : 40;
                } else if (heatmapMetric === 'solids') {
                  const solids = sample.parameters.solids;
                  size = Math.min(120, Math.max(20, (solids / 2500) * 120));
                  color = solids > 1000 ? "rgba(255, 120, 0, 0.45)" : "rgba(0, 198, 255, 0.35)";
                } else if (heatmapMetric === 'sulfate') {
                  const sulfate = sample.parameters.sulfate;
                  size = Math.min(100, Math.max(20, (sulfate / 600) * 100));
                  color = sulfate > 250 ? "rgba(230, 0, 100, 0.45)" : "rgba(0, 198, 255, 0.35)";
                } else if (heatmapMetric === 'chloramines') {
                  const chlor = sample.parameters.chloramines;
                  size = Math.min(90, Math.max(20, (chlor / 10) * 90));
                  color = chlor > 4.0 ? "rgba(255, 0, 0, 0.45)" : "rgba(0, 198, 255, 0.35)";
                }

                return (
                  <g key={`heatmap-${sample.id}`}>
                    <defs>
                      <radialGradient id={`grad-${sample.id}`}>
                        <stop offset="0%" stopColor={color.replace(/[\d.]+\)$/, '1)')} />
                        <stop offset="100%" stopColor={color.replace(/[\d.]+\)$/, '0)')} />
                      </radialGradient>
                    </defs>
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={size} 
                      fill={`url(#grad-${sample.id})`}
                      className="transition-all duration-500 pointer-events-none"
                    />
                  </g>
                );
              })}

              {/* Saved Sample Pins */}
              {savedSamples.map((sample) => {
                const { x, y } = getXY(sample.coordinates.lat, sample.coordinates.lng);
                
                // Perform micro safety check on sample parameters
                const sampleFailed = sample.parameters.ph < 6.5 || sample.parameters.ph > 8.5 || sample.parameters.solids > 1000 || sample.parameters.turbidity > 5;
                const markerColor = sampleFailed ? '#ff4d6d' : '#00e5a0';

                return (
                  <g 
                    key={sample.id} 
                    className="cursor-pointer group/pin"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSample(sample);
                    }}
                    onMouseEnter={() => setHoveredSample(sample)}
                    onMouseLeave={() => setHoveredSample(null)}
                  >
                    <circle cx={x} cy={y} r="16" fill="transparent" />
                    {/* Ring glow */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="6" 
                      fill={markerColor} 
                      className="animate-ping opacity-25"
                      style={{ animationDuration: '3s' }}
                    />
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="5" 
                      fill="#061825" 
                      stroke={markerColor} 
                      strokeWidth="2" 
                      style={{ filter: `drop-shadow(0 0 4px ${markerColor}bb)` }}
                      className="group-hover/pin:scale-125 transition-transform"
                    />
                  </g>
                );
              })}

              {/* Active Click Pin (Placement mode) */}
              {clickCoords && (() => {
                const { x, y } = getXY(clickCoords.lat, clickCoords.lng);
                return (
                  <g className="animate-bounce">
                    <circle cx={x} cy={y} r="10" fill="none" stroke="#00c6ff" strokeWidth="2" strokeDasharray="3,3" />
                    <path 
                      d={`M ${x} ${y} L ${x - 5} ${y - 12} L ${x + 5} ${y - 12} Z`}
                      fill="#00c6ff"
                      style={{ filter: 'drop-shadow(0 0 5px #00c6ff)' }}
                    />
                  </g>
                );
              })()}
            </svg>

            {/* Hover tooltip overlay */}
            {hoveredSample && (() => {
              const pos = getXY(hoveredSample.coordinates.lat, hoveredSample.coordinates.lng);
              return (
                <div 
                  className="absolute z-20 bg-[#061825] border border-blue-500/25 rounded-lg p-3 w-48 shadow-lg pointer-events-none transition-all"
                  style={{
                    top: `${pos.yNum - 20}%`,
                    left: `${pos.xNum + 4}%`,
                    transform: 'translateY(-50%)'
                  }}
                >
                  <p className="font-syne text-[11px] font-bold text-white leading-tight truncate">{hoveredSample.name}</p>
                  <p className="text-[9px] text-[#00c6ff] font-medium tracking-wide uppercase mt-0.5">{hoveredSample.category} Water</p>
                  
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400">pH: {hoveredSample.parameters.ph.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">|</span>
                    <span className="text-[10px] text-slate-400">TDS: {hoveredSample.parameters.solids.toFixed(0)}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 italic">Click pin to load data</p>
                </div>
              );
            })()}

            {/* Instruction Banner */}
            <div className="absolute bottom-2 left-2 z-20 bg-[#061825]/90 border border-slate-700/50 backdrop-blur rounded px-2.5 py-1 text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#00c6ff] rounded-full animate-ping"></span>
              Click anywhere on the map grid to place a new water sample pin.
            </div>
          </div>

          {/* PIN DETAILS / SAVE ACTION */}
          <div className="bg-[#061825]/80 border border-blue-500/10 rounded-xl p-4 flex flex-col justify-between space-y-4">
            {clickCoords ? (
              <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
                <div className="flex items-center justify-between">
                  <h4 className="font-syne font-bold text-xs text-[#00c6ff] tracking-wider uppercase">New Sample Coordinates</h4>
                  <button 
                    onClick={() => setClickCoords(null)}
                    className="text-slate-500 hover:text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                </div>

                 <div className="p-3 bg-[#020c14] border border-blue-500/10 rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Latitude</span>
                    <span className="text-slate-300 font-mono">{clickCoords.lat.toFixed(5)}° N</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Longitude</span>
                    <span className="text-slate-300 font-mono">{clickCoords.lng.toFixed(5)}° W</span>
                  </div>
                </div>

                <div className="p-3 bg-[#020c14] border border-blue-500/10 rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-syne">Current WQI</span>
                    <span className="text-slate-300 font-bold font-mono">{wqi} / 100</span>
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
                      placeholder="e.g. City Park Fountain" 
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      className="w-full bg-[#020c14] border border-blue-500/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00c6ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">Source Type</label>
                    <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-300">
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
                  Pin Sample on Map
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <MapPin className="w-8 h-8 text-slate-600 animate-bounce" />
                <div>
                  <h4 className="font-syne text-xs font-bold text-slate-300 uppercase tracking-wide">Ready to Pin</h4>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                    Run your water sample analysis, click on the map, and pin the results to that location.
                  </p>
                </div>
              </div>
            )}

            {/* Quick stats / summary */}
            <div className="border-t border-blue-500/10 pt-3 mt-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Map Coverage</span>
                <span className="text-slate-300 font-bold">120 km²</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                <span>Toxic Heatspots</span>
                <span className="text-red-400 font-bold">
                  {savedSamples.filter(s => s.parameters.ph < 6.5 || s.parameters.ph > 8.5 || s.parameters.solids > 1000 || s.parameters.turbidity > 5.0).length} Detected
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SAVED SAMPLE LIST TABLE */
        <div className="overflow-x-auto border border-blue-500/10 rounded-xl bg-[#020c14]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-blue-500/10 text-slate-500 bg-[#061825]">
                <th className="p-3 font-syne uppercase font-bold tracking-wider">Status</th>
                <th className="p-3 font-syne uppercase font-bold tracking-wider">Sample Name</th>
                <th className="p-3 font-syne uppercase font-bold tracking-wider font-mono">Coordinates</th>
                <th className="p-3 font-syne uppercase font-bold tracking-wider">Date Logged</th>
                <th className="p-3 font-syne uppercase font-bold tracking-wider">Critical Failures</th>
                <th className="p-3 font-syne text-right font-bold tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedSamples.map((sample) => {
                // Determine failed parameters
                const failedKeys: string[] = [];
                if (sample.parameters.ph < 6.5 || sample.parameters.ph > 8.5) failedKeys.push("pH");
                if (sample.parameters.solids > 1000) failedKeys.push("TDS");
                if (sample.parameters.sulfate > 250) failedKeys.push("Sulfate");
                if (sample.parameters.turbidity > 5) failedKeys.push("Turbidity");
                if (sample.parameters.chloramines > 4.0) failedKeys.push("Chloramines");
                if (sample.parameters.trihalomethanes > 80) failedKeys.push("THMs");

                const failedCount = failedKeys.length;
                const isSampleSafe = failedCount === 0;

                return (
                  <tr key={sample.id} className="border-b border-blue-500/5 hover:bg-[#061825]/40 transition">
                    <td className="p-3">
                      {isSampleSafe ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#00e5a0] bg-[#00e5a0]/10 border border-[#00e5a0]/20 px-2 py-0.5 rounded-full font-bold">
                          <ShieldCheck className="w-3 h-3" /> Potable
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#ff4d6d] bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 px-2 py-0.5 rounded-full font-bold">
                          <ShieldAlert className="w-3 h-3" /> Unsafe
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-slate-200">
                      <div>
                        <p className="font-bold">{sample.name}</p>
                        <p className="text-[10px] text-slate-500 capitalize">{sample.category} Water</p>
                      </div>
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[10px]">
                      {sample.coordinates.lat.toFixed(4)}° N, {sample.coordinates.lng.toFixed(4)}° W
                    </td>
                    <td className="p-3 text-slate-400 font-mono">{sample.dateCollected}</td>
                    <td className="p-3 text-slate-300">
                      {failedCount > 0 ? (
                        <span className="text-[#ff4d6d] font-bold">{failedKeys.join(", ")}</span>
                      ) : (
                        <span className="text-slate-500">None (Optimal)</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleSelectSample(sample)}
                          className="px-2.5 py-1 bg-[#00c6ff]/10 hover:bg-[#00c6ff]/20 text-[#00c6ff] rounded text-[10px] font-syne font-bold transition"
                        >
                          Load Parameters
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
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No water quality samples saved yet. Map locations or save current values to populate this table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
