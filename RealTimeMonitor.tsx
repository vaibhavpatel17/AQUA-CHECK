import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  ExternalLink,
  Database,
  Droplets,
  Thermometer,
  Wind
} from 'lucide-react';
import { 
  searchNearbyStations, 
  getStationWaterData, 
  convertUSGSToParameters,
  USGSStation,
  USGSWaterData,
  STATE_CODES 
} from '../utils/usgsApi';
import { WaterParameters } from '../utils/waterPredictor';

interface RealTimeMonitorProps {
  userLocation: [number, number] | null;
  onImportRealData: (params: WaterParameters, sourceName: string, disclaimers: string[]) => void;
}

export const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({ 
  userLocation, 
  onImportRealData 
}) => {
  const [searchMode, setSearchMode] = useState<'nearby' | 'state'>('nearby');
  const [selectedState, setSelectedState] = useState('NY');
  const [radius, setRadius] = useState(25);
  const [stations, setStations] = useState<USGSStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<USGSStation | null>(null);
  const [stationData, setStationData] = useState<USGSWaterData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedDisclaimers, setImportedDisclaimers] = useState<string[]>([]);

  // Search for stations
  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setStations([]);
    setSelectedStation(null);
    setStationData(null);

    try {
      let results: USGSStation[] = [];

      if (searchMode === 'nearby') {
        if (!userLocation) {
          setError('Please allow location access or use state search.');
          setIsLoading(false);
          return;
        }
        results = await searchNearbyStations(userLocation[0], userLocation[1], radius);
      } else {
        results = await searchNearbyStations(40.7128, -74.0060, 50); // Fallback to NY area for state search
        // Filter by state name matching
        results = results.filter(s => s.state === selectedState).slice(0, 20);
      }

      if (results.length === 0) {
        setError('No active monitoring stations found in this area.');
      } else {
        setStations(results);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stations.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data for selected station
  const handleSelectStation = async (station: USGSStation) => {
    setIsLoading(true);
    setError(null);
    setSelectedStation(station);
    setStationData(null);

    try {
      const data = await getStationWaterData(station.siteCode);
      if (data) {
        setStationData(data);
      } else {
        setError('No recent data available from this station.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch water data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Import data to analyzer
  const handleImport = () => {
    if (!stationData) return;

    const converted = convertUSGSToParameters(stationData);
    setImportedDisclaimers(converted.disclaimers);
    onImportRealData(converted.parameters, converted.sourceName, converted.disclaimers);
  };

  // Format timestamp
  const formatTime = (isoString: string) => {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="bg-[#0a2235]/70 border border-blue-500/10 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-blue-500/10 pb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Database className="w-5 h-5 text-[#00c6ff]" />
        </div>
        <div>
          <h3 className="font-syne font-bold text-lg text-white">Real-Time USGS Water Monitor</h3>
          <p className="text-xs text-slate-400">
            Pull actual sensor data from {stations.length > 0 ? `${stations.length} ` : ''}
            U.S. Geological Survey monitoring stations
          </p>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-[#061825]/80 rounded-xl p-4 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSearchMode('nearby')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-syne font-bold transition ${
              searchMode === 'nearby'
                ? 'bg-[#00c6ff]/20 text-[#00c6ff] border border-[#00c6ff]/30'
                : 'bg-[#020c14] text-slate-400 border border-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 inline mr-1" />
            Near Me
          </button>
          <button
            onClick={() => setSearchMode('state')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-syne font-bold transition ${
              searchMode === 'state'
                ? 'bg-[#00c6ff]/20 text-[#00c6ff] border border-[#00c6ff]/30'
                : 'bg-[#020c14] text-slate-400 border border-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5 inline mr-1" />
            By State
          </button>
        </div>

        {searchMode === 'nearby' ? (
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Search Radius: {radius} miles
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-[#00c6ff]"
            />
            {!userLocation && (
              <p className="text-[10px] text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Location access required. Click "My Location" on the map first.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Select State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-[#020c14] border border-blue-500/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00c6ff]"
            >
              {Object.entries(STATE_CODES).map(([name, code]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={isLoading || (searchMode === 'nearby' && !userLocation)}
          className="w-full py-2.5 bg-gradient-to-r from-[#0072ff] to-[#00c6ff] hover:from-[#00c6ff] hover:to-[#0072ff] rounded-lg text-xs font-syne font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {isLoading ? 'Searching USGS Database...' : 'Find Monitoring Stations'}
        </button>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Stations List */}
      {stations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-syne font-bold text-xs text-slate-300 uppercase tracking-wider">
            Found {stations.length} Active Stations
          </h4>
          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
            {stations.map((station) => (
              <button
                key={station.siteCode}
                onClick={() => handleSelectStation(station)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedStation?.siteCode === station.siteCode
                    ? 'bg-[#00c6ff]/10 border-[#00c6ff]/40'
                    : 'bg-[#020c14]/60 border-blue-500/10 hover:border-blue-500/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200 line-clamp-1">{station.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {station.type} • {station.county !== 'Unknown' ? `County: ${station.county}` : station.state}
                    </p>
                  </div>
                  <MapPin className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Station Data */}
      {selectedStation && (
        <div className="bg-[#061825]/90 border border-[#00c6ff]/20 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-syne font-bold text-sm text-[#00c6ff]">
              {selectedStation.name}
            </h4>
            <a
              href={`https://waterdata.usgs.gov/nwis/uv?site_no=${selectedStation.siteCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-slate-400 hover:text-[#00c6ff] flex items-center gap-1"
            >
              USGS Source <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {isLoading ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-8 h-8 text-[#00c6ff] animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Fetching real-time sensor data...</p>
            </div>
          ) : stationData ? (
            <div className="space-y-4">
              <p className="text-[10px] text-slate-500">
                Last Updated: {formatTime(stationData.timestamp)}
              </p>

              {/* Measured Parameters */}
              <div className="grid grid-cols-2 gap-3">
                {stationData.parameters.ph && (
                  <div className="bg-[#020c14] rounded-lg p-3 border border-blue-500/10">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold">
                      <Activity className="w-3 h-3" />
                      pH Level
                    </div>
                    <p className="text-lg font-syne font-bold text-white mt-1">
                      {stationData.parameters.ph.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-slate-500">Measured by sensor</p>
                  </div>
                )}

                {stationData.parameters.turbidity && (
                  <div className="bg-[#020c14] rounded-lg p-3 border border-blue-500/10">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold">
                      <Droplets className="w-3 h-3" />
                      Turbidity
                    </div>
                    <p className="text-lg font-syne font-bold text-white mt-1">
                      {stationData.parameters.turbidity.toFixed(1)} <span className="text-xs text-slate-500">NTU</span>
                    </p>
                    <p className="text-[9px] text-slate-500">Measured by sensor</p>
                  </div>
                )}

                {stationData.parameters.specificConductance && (
                  <div className="bg-[#020c14] rounded-lg p-3 border border-blue-500/10">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold">
                      <Wind className="w-3 h-3" />
                      Conductivity
                    </div>
                    <p className="text-lg font-syne font-bold text-white mt-1">
                      {stationData.parameters.specificConductance} <span className="text-xs text-slate-500">μS/cm</span>
                    </p>
                    <p className="text-[9px] text-slate-500">Measured by sensor</p>
                  </div>
                )}

                {stationData.parameters.waterTemperature && (
                  <div className="bg-[#020c14] rounded-lg p-3 border border-blue-500/10">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold">
                      <Thermometer className="w-3 h-3" />
                      Temperature
                    </div>
                    <p className="text-lg font-syne font-bold text-white mt-1">
                      {stationData.parameters.waterTemperature.toFixed(1)} <span className="text-xs text-slate-500">°C</span>
                    </p>
                    <p className="text-[9px] text-slate-500">Measured by sensor</p>
                  </div>
                )}
              </div>

              {/* Import Button */}
              <div className="space-y-3">
                <button
                  onClick={handleImport}
                  className="w-full py-3 bg-gradient-to-r from-[#00e5a0] to-[#0072ff] hover:from-[#0072ff] hover:to-[#00e5a0] rounded-lg text-xs font-syne font-bold text-white flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Import Real Data to Analyzer
                </button>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-[10px] text-amber-400 leading-relaxed">
                    <strong className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      Important Limitation
                    </strong>
                    USGS river sensors measure pH, turbidity, and conductivity directly. 
                    Hardness, chloramines, sulfate, organic carbon, and THMs are 
                    <strong> estimated</strong> based on correlations, not measured.
                    For drinking water decisions, laboratory testing is required.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Disclaimers after import */}
      {importedDisclaimers.length > 0 && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <h5 className="text-[10px] font-syne font-bold text-[#00c6ff] uppercase tracking-wider mb-2">
            Data Import Notice
          </h5>
          {importedDisclaimers.map((d, i) => (
            <p key={i} className="text-[10px] text-slate-400 leading-relaxed">
              {d}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
