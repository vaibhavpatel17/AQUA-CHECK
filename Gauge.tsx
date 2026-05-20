import React, { useState } from 'react';
import { WaterParameters, PARAMETER_GUIDELINES, ParameterGuideline } from '../utils/waterPredictor';
import { Info, CheckCircle2, AlertTriangle, XCircle, Droplets } from 'lucide-react';

interface GaugeProps {
  guideline: ParameterGuideline;
  value: number;
}

export const ParameterGauge: React.FC<GaugeProps> = ({ guideline, value }) => {
  const { name, minSafe, maxSafe, unit, icon, recommended } = guideline;

  // Determine standard scale maximums for visualization
  const getScaleMax = (key: string): number => {
    switch (key) {
      case 'ph': return 14;
      case 'hardness': return 400;
      case 'solids': return 2500;
      case 'chloramines': return 10;
      case 'sulfate': return 600;
      case 'conductivity': return 1000;
      case 'organic_carbon': return 10;
      case 'trihalomethanes': return 160;
      case 'turbidity': return 10;
      default: return 100;
    }
  };

  const scaleMax = getScaleMax(guideline.key);
  
  // Calculate percentage for SVG arc (clamped 0 - 100)
  const percentage = Math.min(100, Math.max(0, (value / scaleMax) * 100));

  // Determine safety status
  const getStatus = (): { status: 'safe' | 'warning' | 'critical'; color: string; bg: string; text: string } => {
    // Custom logic per parameter to reflect warning vs critical ranges
    const val = value;
    if (guideline.key === 'ph') {
      if (val >= 6.5 && val <= 8.5) return { status: 'safe', color: '#00e5a0', bg: 'rgba(0,229,160,0.1)', text: 'text-[#00e5a0]' };
      if (val >= 5.5 && val < 6.5 || val > 8.5 && val <= 9.5) return { status: 'warning', color: '#ffae19', bg: 'rgba(255,174,25,0.1)', text: 'text-[#ffae19]' };
      return { status: 'critical', color: '#ff4d6d', bg: 'rgba(255,77,109,0.1)', text: 'text-[#ff4d6d]' };
    }
    
    // Limits
    const limit = maxSafe;
    const minLimit = minSafe;

    if (val >= minLimit && val <= limit) {
      return { status: 'safe', color: '#00e5a0', bg: 'rgba(0,229,160,0.1)', text: 'text-[#00e5a0]' };
    } else {
      // If slightly outside range
      const ratio = val > limit ? val / limit : minLimit / (val || 0.1);
      if (ratio < 1.5) {
        return { status: 'warning', color: '#ffae19', bg: 'rgba(255,174,25,0.1)', text: 'text-[#ffae19]' };
      }
      return { status: 'critical', color: '#ff4d6d', bg: 'rgba(255,77,109,0.1)', text: 'text-[#ff4d6d]' };
    }
  };

  const safety = getStatus();
  
  // SVG Arc calculation parameters
  const radius = 38;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-[#0a2235]/60 hover:bg-[#0a2235] border border-blue-500/10 hover:border-blue-500/30 rounded-2xl p-4 transition-all duration-300 relative group cursor-pointer">
      <div className="relative w-24 h-24 mb-3">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-slate-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Arc */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={safety.color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${safety.color}55)` }}
          />
        </svg>

        {/* Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold font-syne text-white tracking-tight">
            {value.toFixed(1).replace(/\.0$/, '')}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {unit}
          </span>
        </div>

        {/* Icon Badge */}
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-lg bg-[#061825] border border-slate-700 flex items-center justify-center text-xs">
          {icon}
        </div>
      </div>

      <div className="text-center w-full">
        <h4 className="text-xs font-bold text-slate-200 tracking-wide font-syne mb-1">
          {name}
        </h4>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: safety.color }}></span>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${safety.text}`}>
            {safety.status}
          </span>
        </div>
        <p className="text-[9px] text-slate-500 mt-1">
          WHO Limit: {recommended}
        </p>
      </div>

      {/* Info indicator that reveals on hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300">
        <Info className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};

interface GaugeMatrixProps {
  parameters: WaterParameters;
}

export const GaugeMatrix: React.FC<GaugeMatrixProps> = ({ parameters }) => {
  const [selectedParam, setSelectedParam] = useState<keyof WaterParameters | null>(null);

  const activeGuideline = selectedParam ? PARAMETER_GUIDELINES[selectedParam] : null;
  const activeValue = selectedParam ? parameters[selectedParam] : 0;

  // Function to get active parameter status details
  const getDetailStatus = (key: keyof WaterParameters, val: number) => {
    const guide = PARAMETER_GUIDELINES[key];
    if (key === 'ph') {
      if (val >= 6.5 && val <= 8.5) {
        return { label: 'Optimal', desc: 'Neutral, safe, and balanced.', icon: CheckCircle2, color: 'text-[#00e5a0] bg-[#00e5a0]/10 border-[#00e5a0]/30' };
      }
      if (val >= 5.5 && val < 6.5) {
        return { label: 'Mild Acidic', desc: 'Slightly acidic. Can leach trace plumbing metals.', icon: AlertTriangle, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
      }
      if (val > 8.5 && val <= 9.5) {
        return { label: 'Mild Alkaline', desc: 'Slightly alkaline. Safe but potential mineral scales.', icon: AlertTriangle, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
      }
      return { label: 'Severe Range', desc: 'Extremely corrosive or caustic. Dangerous for skin & ingestion.', icon: XCircle, color: 'text-[#ff4d6d] bg-[#ff4d6d]/10 border-[#ff4d6d]/30' };
    }

    if (val >= guide.minSafe && val <= guide.maxSafe) {
      return { label: 'Safe Range', desc: 'Fully compliant with WHO drinking standards.', icon: CheckCircle2, color: 'text-[#00e5a0] bg-[#00e5a0]/10 border-[#00e5a0]/30' };
    } else {
      const ratio = val > guide.maxSafe ? val / guide.maxSafe : guide.minSafe / (val || 0.1);
      if (ratio < 1.5) {
        return { label: 'Moderate Violation', desc: 'Sub-optimal level. Minor treatment required.', icon: AlertTriangle, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
      }
      return { label: 'Critical Violation', desc: 'Severe contamination threat. Advanced filtration required.', icon: XCircle, color: 'text-[#ff4d6d] bg-[#ff4d6d]/10 border-[#ff4d6d]/30' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-blue-500/10 pb-3">
        <div>
          <h3 className="font-syne font-bold text-lg text-white flex items-center gap-2">
            <Droplets className="w-5 h-5 text-[#00c6ff] animate-pulse" />
            Parameter Safety Matrix
          </h3>
          <p className="text-xs text-slate-400">Click any gauge to see detailed WHO compliance insights and treatment tips.</p>
        </div>
      </div>

      {/* Gauges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-4">
        {(Object.keys(PARAMETER_GUIDELINES) as Array<keyof WaterParameters>).map((key) => (
          <div key={key} onClick={() => setSelectedParam(key)}>
            <ParameterGauge
              guideline={PARAMETER_GUIDELINES[key]}
              value={parameters[key]}
            />
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      {activeGuideline && selectedParam && (
        <div className="bg-[#061825] border border-blue-500/15 rounded-xl p-5 relative overflow-hidden transition-all duration-300 animate-[fadeIn_0.3s_ease]">
          <div className="absolute top-0 right-0 p-4">
            <button 
              onClick={() => setSelectedParam(null)}
              className="text-slate-500 hover:text-slate-200 text-xs font-bold font-syne"
            >
              ✕ CLOSE
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-5 items-start">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl flex-shrink-0">
              {activeGuideline.icon}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-syne text-lg font-bold text-white">{activeGuideline.name}</h4>
                  <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    Current: {activeValue.toFixed(2)} {activeGuideline.unit === '0–14' ? '' : activeGuideline.unit}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{activeGuideline.description}</p>
              </div>

              {/* Status block */}
              {(() => {
                const status = getDetailStatus(selectedParam, activeValue);
                const StatusIcon = status.icon;
                return (
                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${status.color}`}>
                    <StatusIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wide">{status.label}</p>
                      <p className="text-xs opacity-90 mt-0.5">{status.desc}</p>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#0a2235]/40 rounded-lg border border-blue-500/5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Standard Limits</p>
                  <p className="text-slate-300 font-medium">
                    WHO Guideline: <span className="text-[#00c6ff] font-bold">{activeGuideline.recommended}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Acceptable range for potable drinking water.</p>
                </div>
                <div className="p-3 bg-[#0a2235]/40 rounded-lg border border-blue-500/5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Treatment Action</p>
                  <p className="text-slate-300 font-medium">
                    {getTreatmentAction(selectedParam, activeValue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to return treatment action recommendations
const getTreatmentAction = (key: keyof WaterParameters, val: number): string => {
  const guide = PARAMETER_GUIDELINES[key];
  
  if (key === 'ph') {
    if (val < 6.5) return 'Acidic pH: Inject soda ash, limestone filter, or potassium carbonate.';
    if (val > 8.5) return 'Alkaline pH: Inject food-grade citric or phosphoric acid.';
    return 'pH Balance: Keep as is. Fully neutral.';
  }

  if (val > guide.maxSafe) {
    switch (key) {
      case 'hardness': return 'Hard water: Add water softener (ion exchange resin) or chemical chelators.';
      case 'solids': return 'High TDS: Use Reverse Osmosis (RO) filtration or Distillation systems.';
      case 'chloramines': return 'High Chloramine: Run through active carbon block or catalytic carbon.';
      case 'sulfate': return 'High Sulfate: Apply Reverse Osmosis or Distillation treatment.';
      case 'conductivity': return 'High Conductivity: Demineralization or RO filtration.';
      case 'organic_carbon': return 'High TOC: Apply coagulation, ozone treatment, or UV sterilization.';
      case 'trihalomethanes': return 'High THMs: Active carbon adsorption, or air stripping aeration.';
      case 'turbidity': return 'High Turbidity: Use settling tanks, sand filters, or flocculants.';
      default: return 'No action required.';
    }
  }

  if (key === 'chloramines' && val < guide.minSafe) {
    return 'Insufficient Disinfection: Increase chlorination or add chlorine dioxide.';
  }
  if (key === 'hardness' && val < guide.minSafe) {
    return 'Extremely Soft: Re-mineralize by passing through calcite filters.';
  }

  return 'Optimal Level: No immediate filtration action needed.';
};
