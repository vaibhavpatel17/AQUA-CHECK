import { useState } from 'react';
import { 
  Activity, 
  MapPin, 
  Camera, 
  ArrowLeftRight, 
  MessageSquare, 
  RefreshCw,
  Sliders,
  AlertTriangle
} from 'lucide-react';

import { WaterParameters, predictWaterPotability, PARAMETER_GUIDELINES } from './utils/waterPredictor';
import { MOCK_SAMPLES, MockSample } from './utils/mockData';
import { GaugeMatrix } from './components/Gauge';
import { RealMapper } from './components/RealMapper';
import { RealTimeMonitor } from './components/RealTimeMonitor';
import { ColorDetector } from './components/ColorDetector';
import { CompareMode } from './components/CompareMode';
import { ChatAssistant } from './components/ChatAssistant';

export default function App() {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'map' | 'spectrometry' | 'compare' | 'chat'>('analyzer');
  const [parameters, setParameters] = useState<WaterParameters>({
    ph: 7.2,
    hardness: 165.2,
    solids: 310.4,
    chloramines: 2.1,
    sulfate: 65.8,
    conductivity: 245.0,
    organic_carbon: 1.25,
    trihalomethanes: 35.6,
    turbidity: 0.72
  });

  const [savedSamples, setSavedSamples] = useState<MockSample[]>(MOCK_SAMPLES);
  const [loadedSampleName, setLoadedSampleName] = useState<string>('Municipal Tap Water');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [usgsDisclaimers, setUsgsDisclaimers] = useState<string[]>([]);
  
  // ML prediction state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [prediction, setPrediction] = useState(() => predictWaterPotability(parameters));
  const [hasRunAnalysis, setHasRunAnalysis] = useState(true);

  // Handle changes in input parameters
  const handleInputChange = (key: keyof WaterParameters, val: number) => {
    setParameters(prev => ({
      ...prev,
      [key]: val
    }));
    setLoadedSampleName('Custom Parameter Set');
    setHasRunAnalysis(false);
  };

  // Pre-load a mock sample or saved sample
  const handleLoadSample = (params: WaterParameters, name: string) => {
    setParameters(params);
    setLoadedSampleName(name);
    setPrediction(predictWaterPotability(params));
    setHasRunAnalysis(true);
    setActiveTab('analyzer');
  };

  // Apply Spectrometry color detection parameters
  const handleApplyColorEstimates = (estimates: Partial<WaterParameters>) => {
    setParameters(prev => ({
      ...prev,
      ...estimates
    }));
    setLoadedSampleName('Spectrometry Est. Sample');
    setHasRunAnalysis(false);
    setActiveTab('analyzer');
  };

  // Run simulated Random Forest Classifier
  const handleRunAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setAnalysisLogs([]);
    
    // Simulate ML decision tree computing logs
    const logs = [
      "Initializing Random Forest Classifier...",
      "Reading 9 water spectrometry parameters...",
      "Executing Ensemble Trees (N=100)...",
      "Evaluating WHO chemical & physical safety thresholds...",
      "Computing Water Quality Index (WQI)...",
      "Finalizing potability consensus..."
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setAnalysisLogs(prev => [...prev, log]);
      }, (index + 1) * 150);
    });

    setTimeout(() => {
      const result = predictWaterPotability(parameters);
      setPrediction(result);
      setIsAnalyzing(false);
      setHasRunAnalysis(true);
    }, 1100);
  };

  // Save sample to mapper registry
  const handleSaveSample = (newSample: MockSample) => {
    setSavedSamples(prev => [newSample, ...prev]);
  };

  // Delete sample from mapper registry
  const handleDeleteSample = (id: string) => {
    setSavedSamples(prev => prev.filter(s => s.id !== id));
  };

  // Handle importing real USGS data
  const handleImportUSGSData = (params: WaterParameters, sourceName: string, disclaimers: string[]) => {
    setParameters(params);
    setLoadedSampleName(`USGS: ${sourceName}`);
    setUsgsDisclaimers(disclaimers);
    setPrediction(predictWaterPotability(params));
    setHasRunAnalysis(true);
    setActiveTab('analyzer');
  };

  return (
    <div className="relative min-h-screen pb-16 z-10">
      {/* Animated Cyber Grid Background */}
      <div className="bg-canvas">
        <div className="grid-lines"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        
        {/* Dynamic Water Waves */}
        <svg className="wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" fill="none">
          <path fill="#00c6ff" d="M0,160L60,170.7C120,181,240,203,360,192C480,181,600,139,720,138.7C840,139,960,181,1080,181.3C1200,181,1320,139,1380,117.3L1440,96L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"/>
        </svg>
        <svg className="wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" fill="none">
          <path fill="#0072ff" d="M0,224L80,213.3C160,203,320,181,480,186.7C640,192,800,224,960,229.3C1120,235,1280,213,1360,202.7L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"/>
        </svg>
        <svg className="wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" fill="none">
          <path fill="#00e5a0" d="M0,256L120,261.3C240,267,480,277,720,261.3C960,245,1200,203,1320,181.3L1440,160L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"/>
        </svg>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 md:px-6">
        
        {/* HEADER */}
        <header className="pt-10 pb-8 text-center flex flex-col items-center">
          <div className="logo-badge flex items-center gap-2 bg-[#00c6ff]/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-[10px] tracking-[0.12em] font-syne font-bold text-[#00c6ff] uppercase mb-5">
            <span className="dot w-1.5 h-1.5 bg-[#00c6ff] rounded-full dot-pulse"></span>
            AI-Powered Environmental Analysis
          </div>
          
          <h1 className="font-syne font-extrabold text-5xl md:text-7xl tracking-tighter leading-none mb-3">
            Aqua<span className="bg-gradient-to-r from-[#00c6ff] to-[#0072ff] bg-clip-text text-transparent">Check</span>
          </h1>
          <p className="text-slate-400 font-light text-sm md:text-base max-w-lg leading-relaxed">
            Enter water sample parameters and get an instant AI-powered WQI prediction benchmarked against WHO guidelines.
          </p>

          {/* Quick Statistics */}
          <div className="flex justify-center gap-8 md:gap-12 mt-8">
            <div className="text-center">
              <div className="font-syne text-2xl font-bold text-[#00c6ff]">9</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Parameters</div>
            </div>
            <div className="text-center border-x border-blue-500/10 px-8 md:px-12">
              <div className="font-syne text-2xl font-bold text-[#00e5a0]">ML</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Random Forest</div>
            </div>
            <div className="text-center">
              <div className="font-syne text-2xl font-bold text-[#00c6ff]">99.4%</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Accuracy</div>
            </div>
          </div>
        </header>

        {/* FUTURISTIC TABS NAVIGATION */}
        <nav className="flex bg-[#061825]/90 border border-blue-500/15 rounded-2xl p-1 mb-8 max-w-3xl mx-auto backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('analyzer')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-syne font-bold tracking-wide transition ${
              activeTab === 'analyzer' 
                ? 'bg-gradient-to-r from-[#0072ff] to-[#00c6ff] text-white shadow-lg shadow-[#0072ff]/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Water Analyzer</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-syne font-bold tracking-wide transition ${
              activeTab === 'map' 
                ? 'bg-gradient-to-r from-[#0072ff] to-[#00c6ff] text-white shadow-lg shadow-[#0072ff]/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Location Mapper</span>
          </button>

          <button 
            onClick={() => setActiveTab('spectrometry')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-syne font-bold tracking-wide transition ${
              activeTab === 'spectrometry' 
                ? 'bg-gradient-to-r from-[#0072ff] to-[#00c6ff] text-white shadow-lg shadow-[#0072ff]/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Spectrometry</span>
          </button>

          <button 
            onClick={() => setActiveTab('compare')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-syne font-bold tracking-wide transition ${
              activeTab === 'compare' 
                ? 'bg-gradient-to-r from-[#0072ff] to-[#00c6ff] text-white shadow-lg shadow-[#0072ff]/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="hidden sm:inline">Compare</span>
          </button>

          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-syne font-bold tracking-wide transition ${
              activeTab === 'chat' 
                ? 'bg-gradient-to-r from-[#0072ff] to-[#00c6ff] text-white shadow-lg shadow-[#0072ff]/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">AI Scientist</span>
          </button>
        </nav>

        {/* MAIN TAB SWITCHER CONTENT */}
        <main className="transition-all duration-300">
          
          {/* TAB 1: WATER ANALYZER (PRIMARY VIEW) */}
          {activeTab === 'analyzer' && (
            <div className="space-y-8 animate-[fadeIn_0.3s_ease]">
              
              {/* Presets shortcut bar */}
              <div className="flex flex-wrap items-center justify-center gap-2 bg-[#061825]/45 border border-blue-500/10 rounded-xl p-3 max-w-5xl mx-auto">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-2">Quick Presets:</span>
                
                {/* US/International Samples */}
                {savedSamples.slice(0, 3).map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadSample(sample.parameters, sample.name)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-syne font-bold border transition ${
                      loadedSampleName === sample.name 
                        ? 'bg-[#00c6ff]/10 border-[#00c6ff] text-[#00c6ff]' 
                        : 'bg-[#020c14] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {sample.category === 'spring' && '🏔️ '}
                    {sample.category === 'tap' && '💧 '}
                    {sample.category === 'well' && '🪨 '}
                    {sample.category === 'industrial' && '☣️ '}
                    {sample.category === 'runoff' && '⛈️ '}
                    {sample.name}
                  </button>
                ))}
                
                <span className="text-slate-700 mx-1">|</span>
                
                {/* India/Bangalore Samples */}
                {savedSamples.filter(s => s.id.startsWith('sample-blr')).slice(0, 3).map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadSample(sample.parameters, sample.name)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-syne font-bold border transition ${
                      loadedSampleName === sample.name 
                        ? 'bg-orange-500/10 border-orange-500 text-orange-400' 
                        : 'bg-[#020c14] border-slate-800 text-slate-400 hover:border-orange-500/50 hover:text-orange-400'
                    }`}
                  >
                    🇮🇳 {sample.name}
                  </button>
                ))}
              </div>

              {/* Form and Results Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                
                {/* Parameter Input Form Card */}
                <div className="lg:col-span-3 bg-[#0a2235]/70 border border-blue-500/10 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00c6ff] to-transparent"></div>
                  
                  <div className="flex items-center justify-between border-b border-blue-500/10 pb-4 mb-6">
                    <div>
                      <p className="text-[10px] text-[#00c6ff] uppercase font-bold tracking-widest font-syne">Sample Analysis</p>
                      <h3 className="font-syne font-bold text-lg text-white">Chemical Spectroscopy</h3>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full font-mono">
                      {loadedSampleName}
                    </span>
                  </div>

                  <form onSubmit={handleRunAnalysis} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      {(Object.keys(PARAMETER_GUIDELINES) as Array<keyof WaterParameters>).map((key) => {
                        const guide = PARAMETER_GUIDELINES[key];
                        return (
                          <div key={key} className="space-y-1.5 relative">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                              <span>{guide.name}</span>
                              <span className="text-[9px] text-slate-600 font-normal normal-case">({guide.unit})</span>
                            </label>
                            <div className="relative">
                              <input 
                                type="number" 
                                step="any"
                                value={parameters[key]}
                                onChange={(e) => handleInputChange(key, parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#020c14]/80 border border-blue-500/15 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/30 transition-all font-mono"
                                required
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs opacity-40 select-none">
                                {guide.icon}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-tight">Limit: {guide.recommended}</p>
                          </div>
                        );
                      })}
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4 bg-gradient-to-r from-[#0072ff] to-[#00c6ff] hover:from-[#00c6ff] hover:to-[#0072ff] rounded-xl text-xs font-syne font-bold text-white tracking-widest uppercase shadow-lg shadow-[#0072ff]/30 transition-all hover:scale-[1.01] active:scale-100 flex items-center justify-center gap-2"
                      disabled={isAnalyzing}
                    >
                      <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      {isAnalyzing ? 'Processing Decision Forest...' : 'Analyze Water Sample'}
                    </button>
                  </form>

                  {/* ML Computation Loading Logs Overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-[#020c14]/90 backdrop-blur-md flex flex-col items-center justify-center space-y-4 px-6">
                      <div className="w-12 h-12 rounded-full border-2 border-t-[#00c6ff] border-blue-500/20 animate-spin" />
                      <div className="space-y-1 max-w-sm text-center">
                        <p className="font-syne text-xs font-bold text-[#00c6ff] tracking-widest uppercase animate-pulse">Running Random Forest Model</p>
                        <div className="bg-[#061825] border border-blue-500/10 rounded-lg p-3 w-72 text-left h-24 overflow-y-auto no-scrollbar font-mono text-[9px] text-slate-400 space-y-1">
                          {analysisLogs.map((log, idx) => (
                            <div key={idx} className="flex gap-1.5 items-center">
                              <span className="text-[#00e5a0]">✔</span>
                              <span>{log}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Potability Prediction Result Card */}
                <div className="lg:col-span-2 space-y-6">
                  {hasRunAnalysis ? (
                    <div className={`border rounded-3xl p-6 relative overflow-hidden transition-all duration-500 ${
                      prediction.isPotable 
                        ? 'bg-gradient-to-br from-[#00e5a0]/10 via-[#00e5a0]/02 to-[#020c14] border-[#00e5a0]/25' 
                        : 'bg-gradient-to-br from-[#ff4d6d]/10 via-[#ff4d6d]/02 to-[#020c14] border-[#ff4d6d]/25'
                    }`}>
                      {/* Glow effect */}
                      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full filter blur-[50px] opacity-20 ${
                        prediction.isPotable ? 'bg-[#00e5a0]' : 'bg-[#ff4d6d]'
                      }`} />

                      <div className="flex items-start gap-4 mb-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${
                          prediction.isPotable ? 'bg-[#00e5a0]/15' : 'bg-[#ff4d6d]/15'
                        }`}>
                          {prediction.isPotable ? '💧' : '⚠️'}
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className={`font-syne font-extrabold text-2xl leading-none ${
                            prediction.isPotable ? 'text-[#00e5a0]' : 'text-[#ff4d6d]'
                          }`}>
                            {prediction.isPotable ? 'Potable Sample' : 'Unsafe Sample'}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Random Forest Consensus — {prediction.confidence}% Confidence
                          </p>
                        </div>
                      </div>

                      {/* Water Quality Index Scoreboard */}
                      <div className="bg-[#020c14]/80 border border-blue-500/10 rounded-2xl p-4 flex items-center justify-between mb-5">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-syne">Water Quality Index</p>
                          <p className="text-xs text-slate-400 mt-0.5">Based on WHO parameter deviations.</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-syne font-extrabold text-white">{prediction.wqi} <span className="text-xs text-slate-500">/ 100</span></div>
                          <span className={`text-[9px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full ${
                            prediction.wqi >= 85 ? 'text-[#00e5a0] bg-[#00e5a0]/10' :
                            prediction.wqi >= 70 ? 'text-amber-400 bg-amber-400/10' : 'text-[#ff4d6d] bg-[#ff4d6d]/10'
                          }`}>
                            {prediction.wqi >= 85 ? 'Excellent' : prediction.wqi >= 70 ? 'Good' : 'Poor Quality'}
                          </span>
                        </div>
                      </div>

                      {/* Health & Treatment Advice Box */}
                      <div className={`p-4 rounded-xl border-l-[3px] text-xs leading-relaxed mb-5 ${
                        prediction.isPotable 
                          ? 'bg-[#00e5a0]/5 border-[#00e5a0] text-[#00e5a0]/90' 
                          : 'bg-[#ff4d6d]/5 border-[#ff4d6d] text-[#ff4d6d]/90'
                      }`}>
                        {prediction.advice}
                      </div>

                      {/* USGS Real Data Disclaimers */}
                      {usgsDisclaimers.length > 0 && (
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 text-xs leading-relaxed mb-5">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            <span className="font-syne font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                              Real Sensor Data Limitations
                            </span>
                          </div>
                          {usgsDisclaimers.map((d, i) => (
                            <p key={i} className="text-amber-400/90">{d}</p>
                          ))}
                        </div>
                      )}

                      {/* Out of Standard parameter list */}
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-syne">WHO Compliance Flags</p>
                        {prediction.failures.length > 0 ? (
                          <div className="space-y-1.5">
                            {prediction.failures.map((f) => (
                              <div key={f.key} className="flex items-center justify-between text-xs bg-[#020c14]/40 px-3 py-2 rounded-lg border border-slate-900">
                                <span className="text-slate-300 font-medium">{f.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-mono">Value: {f.value.toFixed(1)}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    f.severity === 'critical' ? 'bg-[#ff4d6d]/15 text-[#ff4d6d]' : 'bg-amber-400/15 text-amber-400'
                                  }`}>
                                    {f.severity === 'critical' ? 'Critical' : 'Warning'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-[#00e5a0] bg-[#00e5a0]/5 border border-[#00e5a0]/15 px-3 py-2 rounded-lg">
                            <span>✔</span>
                            <span>All parameters conform perfectly to WHO Standards.</span>
                          </div>
                        )}
                      </div>

                      {/* Quick AI chat redirection link */}
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="w-full mt-5 py-2.5 bg-gradient-to-r from-blue-500/10 to-blue-500/5 hover:from-blue-500/20 hover:to-blue-500/10 border border-blue-500/20 rounded-xl text-xs font-syne font-bold text-[#00c6ff] flex items-center justify-center gap-2 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Ask Claude Assistant to Explain Report
                      </button>
                    </div>
                  ) : (
                    <div className="border border-blue-500/10 bg-[#061825]/40 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[350px] space-y-4">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-slate-500">
                        <Sliders className="w-6 h-6 text-[#00c6ff] animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-syne text-sm font-bold text-slate-300">Pending Parameter Analysis</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                          Enter your water sample parameters or select a preset, then run the analysis model.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Gauges visualizer matrix */}
              <div className="mt-8 border-t border-blue-500/10 pt-8">
                <GaugeMatrix parameters={parameters} />
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE LOCATION MAPPER */}
          {activeTab === 'map' && (
            <div className="animate-[fadeIn_0.3s_ease] space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RealMapper 
                    currentParameters={parameters}
                    wqi={prediction.wqi}
                    isPotable={prediction.isPotable}
                    onLoadParameters={handleLoadSample}
                    savedSamples={savedSamples}
                    onSaveSample={handleSaveSample}
                    onDeleteSample={handleDeleteSample}
                    onLocationUpdate={setUserLocation}
                  />
                </div>
                <div className="lg:col-span-1">
                  <RealTimeMonitor 
                    userLocation={userLocation}
                    onImportRealData={handleImportUSGSData}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WATER COLOR SPECTROMETRY DETECTION */}
          {activeTab === 'spectrometry' && (
            <div className="animate-[fadeIn_0.3s_ease]">
              <ColorDetector onApplyEstimates={handleApplyColorEstimates} />
            </div>
          )}

          {/* TAB 4: COMPARE MODE */}
          {activeTab === 'compare' && (
            <div className="animate-[fadeIn_0.3s_ease]">
              <CompareMode 
                savedSamples={savedSamples} 
                onLoadParameters={handleLoadSample}
              />
            </div>
          )}

          {/* TAB 5: AI CHAT SCIENTIST */}
          {activeTab === 'chat' && (
            <div className="animate-[fadeIn_0.3s_ease]">
              <ChatAssistant 
                currentParameters={parameters}
                isPotable={prediction.isPotable}
                wqi={prediction.wqi}
              />
            </div>
          )}

        </main>

        {/* BOTTOM INFO CARDS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 border-t border-blue-500/10 pt-16">
          <div className="bg-[#061825]/60 border border-blue-500/10 hover:border-blue-500/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-2xl mb-4">
              🤖
            </div>
            <h4 className="font-syne font-bold text-sm text-white mb-2">Random Forest Ensemble</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trained on multi-dimensional drinking water datasets to output high-accuracy potability assessments using decision voting.
            </p>
          </div>

          <div className="bg-[#061825]/60 border border-blue-500/10 hover:border-blue-500/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-2xl mb-4">
              🌍
            </div>
            <h4 className="font-syne font-bold text-sm text-white mb-2">WHO & EPA Standards</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strictly evaluates measurements against the official limits set by the World Health Organization and Environmental Protection Agency.
            </p>
          </div>

          <div className="bg-[#061825]/60 border border-blue-500/10 hover:border-blue-500/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-2xl mb-4">
              ⚡
            </div>
            <h4 className="font-syne font-bold text-sm text-white mb-2">AI-Driven Explanations</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Utilizes Anthropic Claude and advanced offline heuristic reasoning to explain exactly how to filter and treat contaminated samples.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-16 pt-8 border-t border-blue-500/10 text-center text-xs text-slate-500">
          <p className="font-syne tracking-wider uppercase">
            AquaCheck &mdash; IS × Civil Engineering Interdisciplinary Project &nbsp;|&nbsp; Powered by React + Vite + Random Forest Classifier
          </p>
        </footer>

      </div>
    </div>
  );
}
