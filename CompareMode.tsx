import React, { useState } from 'react';
import { ArrowLeftRight, ShieldAlert, ShieldCheck, TrendingUp, Info } from 'lucide-react';
import { MockSample } from '../utils/mockData';
import { PARAMETER_GUIDELINES, predictWaterPotability } from '../utils/waterPredictor';

interface CompareModeProps {
  savedSamples: MockSample[];
  onLoadParameters: (params: MockSample["parameters"], name: string) => void;
}

export const CompareMode: React.FC<CompareModeProps> = ({ savedSamples, onLoadParameters }) => {
  const [sampleAId, setSampleAId] = useState<string>(savedSamples[0]?.id || '');
  const [sampleBId, setSampleBId] = useState<string>(savedSamples[1]?.id || '');

  const sampleA = savedSamples.find(s => s.id === sampleAId);
  const sampleB = savedSamples.find(s => s.id === sampleBId);

  // Run predictions on both selected samples
  const predA = sampleA ? predictWaterPotability(sampleA.parameters) : null;
  const predB = sampleB ? predictWaterPotability(sampleB.parameters) : null;

  // Determine which value is "better/safer" relative to WHO standards
  const getBetterValue = (key: string, valA: number, valB: number): 'A' | 'B' | 'equal' => {
    if (key === 'ph') {
      const distA = Math.abs(valA - 7.0);
      const distB = Math.abs(valB - 7.0);
      if (Math.abs(distA - distB) < 0.05) return 'equal';
      return distA < distB ? 'A' : 'B';
    }

    const guide = PARAMETER_GUIDELINES[key as keyof typeof PARAMETER_GUIDELINES];
    if (!guide) return 'equal';

    // Lower is generally better for contaminants
    if (key === 'solids' || key === 'sulfate' || key === 'organic_carbon' || key === 'trihalomethanes' || key === 'turbidity') {
      if (valA === valB) return 'equal';
      return valA < valB ? 'A' : 'B';
    }

    // For chloramines and hardness, proximity to ideal range
    const ideal = (guide.minSafe + guide.maxSafe) / 2;
    const distA = Math.abs(valA - ideal);
    const distB = Math.abs(valB - ideal);
    if (Math.abs(distA - distB) < 0.1) return 'equal';
    return distA < distB ? 'A' : 'B';
  };

  // Generate treatment effectiveness commentary
  const getComparisonReport = () => {
    if (!predA || !predB || !sampleA || !sampleB) return null;

    const report: string[] = [];
    const wqiDiff = predB.wqi - predA.wqi;

    // Quality Index improvement
    if (wqiDiff > 5) {
      report.push(`**Water Quality Index (WQI) improved by +${wqiDiff} points** (from ${predA.wqi} to ${predB.wqi}), indicating successful filtration/remediation.`);
    } else if (wqiDiff < -5) {
      report.push(`**Water Quality Index (WQI) decreased by ${wqiDiff} points** (from ${predA.wqi} to ${predB.wqi}), indicating significant contamination deterioration.`);
    } else {
      report.push(`Both samples maintain a similar overall Water Quality Index (difference of ${Math.abs(wqiDiff)} points).`);
    }

    // pH Neutralization
    const phA = sampleA.parameters.ph;
    const phB = sampleB.parameters.ph;
    if ((phA < 6.5 && phB >= 6.5 && phB <= 8.5) || (phA > 8.5 && phB >= 6.5 && phB <= 8.5)) {
      report.push(`**pH successfully neutralized** from ${phA.toFixed(2)} to a safe and balanced ${phB.toFixed(2)}.`);
    }

    // Percentage reductions
    const evaluateReduction = (label: string, valA: number, valB: number, unit: string) => {
      if (valA > valB && valA > 0) {
        const pct = Math.round(((valA - valB) / valA) * 100);
        if (pct >= 15) {
          report.push(`**${label} decreased by ${pct}%** (from ${valA.toFixed(1)}${unit} to ${valB.toFixed(1)}${unit}), showing high extraction/absorption efficiency.`);
        }
      } else if (valB > valA && valA > 0) {
        const pct = Math.round(((valB - valA) / valA) * 100);
        if (pct >= 25) {
          report.push(`**${label} concentration surged by +${pct}%** (from ${valA.toFixed(1)}${unit} to ${valB.toFixed(1)}${unit}), warning of increased mineral or organic load.`);
        }
      }
    };

    evaluateReduction("Turbidity", sampleA.parameters.turbidity, sampleB.parameters.turbidity, " NTU");
    evaluateReduction("Solids (TDS)", sampleA.parameters.solids, sampleB.parameters.solids, " ppm");
    evaluateReduction("Sulfate", sampleA.parameters.sulfate, sampleB.parameters.sulfate, " mg/L");
    evaluateReduction("Organic Carbon (TOC)", sampleA.parameters.organic_carbon, sampleB.parameters.organic_carbon, " ppm");
    evaluateReduction("Trihalomethanes", sampleA.parameters.trihalomethanes, sampleB.parameters.trihalomethanes, " μg/L");

    return report;
  };

  const reports = getComparisonReport();

  return (
    <div className="bg-[#0a2235]/70 border border-blue-500/10 rounded-2xl p-6 relative overflow-hidden space-y-6">
      {/* Background orbs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full filter blur-xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-500/10 pb-4 gap-3">
        <div>
          <h3 className="font-syne font-bold text-lg text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#00c6ff]" />
            Water Comparison Mode
          </h3>
          <p className="text-xs text-slate-400">Select two samples side-by-side to evaluate filtration effectiveness or source differences.</p>
        </div>
      </div>

      {savedSamples.length < 2 ? (
        <div className="p-8 text-center text-slate-500 bg-[#020c14] border border-blue-500/10 rounded-xl">
          <p className="font-syne font-bold text-sm text-slate-400">At Least 2 Pinned Samples Required</p>
          <p className="text-xs mt-1">Please log at least two water samples to unlock the side-by-side comparison dashboard.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
          {/* SELECTION DROPDOWNS & SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SAMPLE A */}
            <div className="bg-[#061825]/90 border border-blue-500/10 rounded-xl p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Select Sample A (Baseline)</label>
                <select
                  value={sampleAId}
                  onChange={(e) => setSampleAId(e.target.value)}
                  className="w-full bg-[#020c14] border border-blue-500/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00c6ff] cursor-pointer"
                >
                  {savedSamples.map(s => (
                    <option key={s.id} value={s.id} disabled={s.id === sampleBId}>{s.name} ({s.category})</option>
                  ))}
                </select>
              </div>

              {sampleA && predA && (
                <div className="p-4 bg-[#020c14]/60 rounded-lg border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-syne font-bold">WQI Score:</span>
                    <span className="text-lg font-syne font-extrabold text-[#00c6ff]">{predA.wqi} / 100</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-syne font-bold">Potability Verdict:</span>
                    {predA.isPotable ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#00e5a0] bg-[#00e5a0]/10 border border-[#00e5a0]/25 px-2.5 py-1 rounded-full font-bold">
                        <ShieldCheck className="w-3 h-3" /> Potable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#ff4d6d] bg-[#ff4d6d]/10 border border-[#ff4d6d]/25 px-2.5 py-1 rounded-full font-bold">
                        <ShieldAlert className="w-3 h-3" /> Unsafe
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={() => onLoadParameters(sampleA.parameters, sampleA.name)}
                    className="w-full py-1.5 bg-[#0a2235] hover:bg-[#00c6ff]/10 border border-blue-500/15 rounded text-[10px] font-syne font-bold text-slate-300 hover:text-[#00c6ff] transition-all"
                  >
                    Load into App Analyzer
                  </button>
                </div>
              )}
            </div>

            {/* SAMPLE B */}
            <div className="bg-[#061825]/90 border border-blue-500/10 rounded-xl p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Select Sample B (Comparison)</label>
                <select
                  value={sampleBId}
                  onChange={(e) => setSampleBId(e.target.value)}
                  className="w-full bg-[#020c14] border border-blue-500/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00c6ff] cursor-pointer"
                >
                  {savedSamples.map(s => (
                    <option key={s.id} value={s.id} disabled={s.id === sampleAId}>{s.name} ({s.category})</option>
                  ))}
                </select>
              </div>

              {sampleB && predB && (
                <div className="p-4 bg-[#020c14]/60 rounded-lg border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-syne font-bold">WQI Score:</span>
                    <span className="text-lg font-syne font-extrabold text-[#00c6ff]">{predB.wqi} / 100</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-syne font-bold">Potability Verdict:</span>
                    {predB.isPotable ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#00e5a0] bg-[#00e5a0]/10 border border-[#00e5a0]/25 px-2.5 py-1 rounded-full font-bold">
                        <ShieldCheck className="w-3 h-3" /> Potable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#ff4d6d] bg-[#ff4d6d]/10 border border-[#ff4d6d]/25 px-2.5 py-1 rounded-full font-bold">
                        <ShieldAlert className="w-3 h-3" /> Unsafe
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={() => onLoadParameters(sampleB.parameters, sampleB.name)}
                    className="w-full py-1.5 bg-[#0a2235] hover:bg-[#00c6ff]/10 border border-blue-500/15 rounded text-[10px] font-syne font-bold text-slate-300 hover:text-[#00c6ff] transition-all"
                  >
                    Load into App Analyzer
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC TREATMENT EFFECTIVENESS REPORT */}
          {reports && reports.length > 0 && (
            <div className="bg-[#061825]/50 border border-[#00c6ff]/15 rounded-xl p-5 space-y-3">
              <h4 className="font-syne font-bold text-xs text-[#00c6ff] tracking-wider uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Treatment & Remediation Analysis Report
              </h4>
              <ul className="list-disc pl-4 space-y-2 text-xs text-slate-300">
                {reports.map((rep, idx) => {
                  const parts = rep.split('**');
                  return (
                    <li key={idx}>
                      {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="text-[#00c6ff] font-bold">{p}</strong> : p)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* PARAMETER COMPARISON TABLE */}
          {sampleA && sampleB && (
            <div className="overflow-x-auto border border-blue-500/10 rounded-xl bg-[#020c14]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-blue-500/10 text-slate-500 bg-[#061825]">
                    <th className="p-3.5 font-syne uppercase font-bold tracking-wider">Water Parameter</th>
                    <th className="p-3.5 font-syne uppercase font-bold tracking-wider">WHO Safe Standard</th>
                    <th className="p-3.5 font-syne uppercase font-bold tracking-wider text-center">{sampleA.name} (A)</th>
                    <th className="p-3.5 font-syne uppercase font-bold tracking-wider text-center">{sampleB.name} (B)</th>
                    <th className="p-3.5 font-syne uppercase font-bold tracking-wider text-right">Optimal Match</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(PARAMETER_GUIDELINES) as Array<keyof typeof PARAMETER_GUIDELINES>).map((key) => {
                    const guide = PARAMETER_GUIDELINES[key];
                    const valA = sampleA.parameters[key];
                    const valB = sampleB.parameters[key];
                    
                    const isValASafe = valA >= guide.minSafe && valA <= guide.maxSafe;
                    const isValBSafe = valB >= guide.minSafe && valB <= guide.maxSafe;

                    const better = getBetterValue(key, valA, valB);

                    return (
                      <tr key={key} className="border-b border-blue-500/5 hover:bg-[#061825]/40 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{guide.icon}</span>
                            <div>
                              <p className="font-bold text-slate-200">{guide.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono capitalize">{key.replace('_', ' ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-300 font-mono">
                          {guide.recommended}
                        </td>
                        <td className={`p-3.5 text-center font-mono font-bold ${better === 'A' ? 'bg-[#00c6ff]/5' : ''}`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={isValASafe ? 'text-[#00e5a0]' : 'text-[#ff4d6d]'}>
                              {valA.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-slate-500 font-sans">
                              {isValASafe ? 'Safe' : 'Failed'}
                            </span>
                          </div>
                        </td>
                        <td className={`p-3.5 text-center font-mono font-bold ${better === 'B' ? 'bg-[#00c6ff]/5' : ''}`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={isValBSafe ? 'text-[#00e5a0]' : 'text-[#ff4d6d]'}>
                              {valB.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-slate-500 font-sans">
                              {isValBSafe ? 'Safe' : 'Failed'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-syne font-bold">
                          {better === 'A' && (
                            <span className="text-[#00e5a0] bg-[#00e5a0]/10 border border-[#00e5a0]/25 px-2 py-0.5 rounded text-[10px]">
                              ← Sample A Better
                            </span>
                          )}
                          {better === 'B' && (
                            <span className="text-[#00e5a0] bg-[#00e5a0]/10 border border-[#00e5a0]/25 px-2 py-0.5 rounded text-[10px]">
                              Sample B Better →
                            </span>
                          )}
                          {better === 'equal' && (
                            <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                              Equal Safety
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-start gap-2 bg-[#020c14] border border-blue-500/10 p-3 rounded-lg text-[10px] text-slate-500 leading-normal">
            <Info className="w-4 h-4 text-[#00c6ff] flex-shrink-0 mt-0.5" />
            <span>
              Note: The comparison model evaluates safety using strict World Health Organization parameters. Contaminants such as solids (TDS) and turbidity are evaluated on a percentage-reduction scale to estimate water filtration efficiency.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
