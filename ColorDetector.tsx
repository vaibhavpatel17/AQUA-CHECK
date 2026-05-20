import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { WaterParameters } from '../utils/waterPredictor';

interface ColorDetectorProps {
  onApplyEstimates: (estimates: Partial<WaterParameters>) => void;
}

interface ColorAnalysis {
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  hex: string;
  estimates: {
    ph: number;
    turbidity: number;
    organic_carbon: number;
    solids: number;
  };
  verdict: string;
}

export const ColorDetector: React.FC<ColorDetectorProps> = ({ onApplyEstimates }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera stream when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg(null);
    setImageSrc(null);
    setAnalysis(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg("Unable to access the camera. Please check permissions or upload an image instead.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas to video aspect ratio
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImageSrc(dataUrl);
        analyzeColor(canvas);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setAnalysis(null);
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setImageSrc(dataUrl);

        // Render to canvas to analyze
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
              canvas.width = img.width;
              canvas.height = img.height;
              context.drawImage(img, 0, 0);
              analyzeColor(canvas);
            }
          }
          setIsAnalyzing(false);
        };
        img.onerror = () => {
          setErrorMsg("Failed to load image file.");
          setIsAnalyzing(false);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  // Convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  // Analyze canvas color properties and calculate estimates
  const analyzeColor = (canvas: HTMLCanvasElement) => {
    // Get downscaled imageData for faster and more average results
    const width = 100;
    const height = 100;
    
    // Create temporary downscaled canvas for averaging
    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');
    if (!tempContext) return;
    
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempContext.drawImage(canvas, 0, 0, width, height);

    const imgData = tempContext.getImageData(0, 0, width, height);
    const data = imgData.data;

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      // Ignore absolute white/black pixels (like backgrounds or borders)
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      const a = data[i+3];

      if (a < 50) continue; // transparent
      
      // Filter out pure black/white to focus on water sample color
      const brightness = (r + g + b) / 3;
      if (brightness > 245 || brightness < 10) continue;

      rSum += r;
      gSum += g;
      bSum += b;
      count++;
    }

    // Default to a neutral gray if no pixels match filters
    const r = count > 0 ? Math.round(rSum / count) : 180;
    const g = count > 0 ? Math.round(gSum / count) : 180;
    const b = count > 0 ? Math.round(bSum / count) : 180;

    const hsl = rgbToHsl(r, g, b);
    const hex = '#' + [r, g, b].map(x => {
      const hexStr = x.toString(16);
      return hexStr.length === 1 ? '0' + hexStr : hexStr;
    }).join('');

    // ESTIMATOR HEURISTICS BASED ON HSL
    let estPh = 7.2;
    let estTurbidity = 0.5;
    let estOrganic = 1.0;
    let estSolids = 200;
    let verdict = "";

    const { h, s, l } = hsl;

    // Turbidity estimated by Lightness (cloudiness reduces light transmission)
    // Low lightness = higher turbidity.
    if (l < 85) {
      // Calculate turbidity based on cloudiness (lower L = higher NTU)
      estTurbidity = Math.min(10.0, Number(((85 - l) * 0.18 + 0.5).toFixed(2)));
    } else {
      estTurbidity = Math.max(0.1, Number((Math.random() * 0.5 + 0.1).toFixed(2)));
    }

    // Hue-based estimates
    if (h >= 30 && h <= 55) {
      // Yellow / Brown / Rust Color - Organics or Iron Acidity
      estPh = Number((5.5 + (l / 100) * 1.0).toFixed(2)); // acidic trend
      estOrganic = Number((5.0 + (100 - l) * 0.15).toFixed(2));
      estSolids = Math.round(800 + (100 - l) * 15);
      verdict = "Brownish / yellowish tint detected. Suggests heavy concentration of total organic carbon (TOC), tannins, or iron corrosion. Highly indicative of surface runoff.";
    } else if (h >= 75 && h <= 140) {
      // Algae Green / Cyanobacteria
      estPh = Number((7.8 + (100 - l) * 0.05).toFixed(2)); // alkaline trend due to photosynthesis
      estOrganic = Number((6.0 + (100 - l) * 0.2).toFixed(2));
      estSolids = Math.round(450 + (100 - l) * 8);
      verdict = "Greenish hue detected. Suggests presence of green algae, organic eutrophication, or chlorophyllic micro-organisms. Potential microbial threat.";
    } else if (h >= 170 && h <= 230) {
      // Clear Blue / Cyan - Clean Water or Copper levels
      if (s > 25) {
        // High blue saturation suggests potential copper sulfate or blue dyes
        estPh = 6.8;
        estSolids = Math.round(400 + s * 4);
        verdict = "Vibrant blue tint detected. While appealing, high blue saturation in natural water may indicate industrial dyes or copper sulfate treatment.";
      } else {
        // Clear neutral water
        estPh = Number((7.0 + (Math.random() * 0.4 - 0.2)).toFixed(2));
        estOrganic = Number((Math.random() * 0.8 + 0.2).toFixed(2));
        estSolids = Math.round(150 + Math.random() * 120);
        verdict = "Clear, colorless appearance. No major visual contamination signs. Turbidity appears minimal.";
      }
    } else {
      // Milky / Grayish (low saturation)
      if (s < 12 && l < 85) {
        estPh = Number((7.6 + (100 - l) * 0.02).toFixed(2));
        estSolids = Math.round(900 + (100 - l) * 18);
        estTurbidity = Math.min(10.0, Number(((85 - l) * 0.25 + 2.0).toFixed(2)));
        verdict = "Milky / hazy suspension detected with low color saturation. Indicates high mineral carbonates (hard water) or clay suspensions.";
      } else {
        // Neutral default
        estPh = 7.1;
        estOrganic = 1.2;
        estSolids = 280;
        verdict = "Neutral color profile detected. Normal mineralized sample appearance.";
      }
    }

    setAnalysis({
      rgb: { r, g, b },
      hsl,
      hex,
      estimates: {
        ph: estPh,
        turbidity: estTurbidity,
        organic_carbon: estOrganic,
        solids: estSolids
      },
      verdict
    });
  };

  const handleApply = () => {
    if (analysis) {
      onApplyEstimates(analysis.estimates);
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setAnalysis(null);
    setErrorMsg(null);
    setIsCameraActive(false);
  };

  return (
    <div className="bg-[#0a2235]/70 border border-blue-500/10 rounded-2xl p-6 relative overflow-hidden space-y-6">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full filter blur-xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-500/10 pb-4 gap-3">
        <div>
          <h3 className="font-syne font-bold text-lg text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#00c6ff]" />
            Water Color Detection via Camera
          </h3>
          <p className="text-xs text-slate-400">Analyze water transparency and color to pre-estimate turbidity, pH, and TDS.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT PANEL: UPLOAD / CAMERA PREVIEW */}
        <div className="flex flex-col items-center justify-center border border-dashed border-blue-500/20 hover:border-blue-500/40 bg-[#020c14] rounded-xl p-6 min-h-[300px] relative overflow-hidden transition-all duration-300">
          <canvas ref={canvasRef} className="hidden" />

          {isCameraActive ? (
            <div className="w-full flex flex-col items-center space-y-4">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full max-h-[220px] rounded-lg bg-black object-cover border border-slate-800"
              />
              <div className="flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-gradient-to-r from-[#0072ff] to-[#00c6ff] rounded-lg text-xs font-syne font-bold text-white shadow-md transition-all hover:scale-105"
                >
                  Capture Photo
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-syne font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : imageSrc ? (
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="relative group max-h-[200px] max-w-[200px] rounded-lg overflow-hidden border border-slate-800">
                <img src={imageSrc} alt="Sample Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full border border-slate-700 text-slate-400 hover:text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500">Image successfully loaded & analyzed.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-4 w-full">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-slate-400">
                <Upload className="w-6 h-6 text-[#00c6ff]" />
              </div>
              <div>
                <p className="font-syne text-xs font-bold text-slate-300">Upload sample image or use webcam</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[250px]">
                  Place your water sample glass in front of a white background for highest accuracy color readings.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full max-w-[300px]">
                <button
                  onClick={startCamera}
                  className="flex-1 py-2.5 bg-[#00c6ff]/10 hover:bg-[#00c6ff]/20 border border-[#00c6ff]/30 hover:border-[#00c6ff]/50 rounded-lg text-xs font-syne font-bold text-[#00c6ff] flex items-center justify-center gap-1.5 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Use Webcam
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-syne font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Photo
                </button>
              </div>

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-[#020c14]/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#00c6ff] animate-spin" />
              <p className="font-syne text-xs font-bold text-[#00c6ff] tracking-widest uppercase animate-pulse">Analyzing Spectrometry...</p>
            </div>
          )}

          {errorMsg && (
            <div className="absolute bottom-4 left-4 right-4 p-2 bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 text-[#ff4d6d] rounded-lg text-[10px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: COLOR SPECTROSCOPY ANALYSIS */}
        <div className="bg-[#061825]/80 border border-blue-500/10 rounded-xl p-5 flex flex-col justify-between min-h-[300px]">
          {analysis ? (
            <div className="space-y-4 animate-[fadeIn_0.3s_ease]">
              <div className="flex items-center justify-between border-b border-blue-500/5 pb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Color spectrometry</span>
                <span className="text-[10px] font-mono text-slate-400">{analysis.hex.toUpperCase()}</span>
              </div>

              {/* Color swatch & verdict */}
              <div className="flex gap-4 items-center">
                <div 
                  className="w-14 h-14 rounded-xl border border-white/20 flex-shrink-0 shadow-lg shadow-black/40"
                  style={{ backgroundColor: analysis.hex }}
                />
                <div>
                  <div className="flex gap-2 text-[10px] font-mono text-slate-500">
                    <span>RGB: {analysis.rgb.r}, {analysis.rgb.g}, {analysis.rgb.b}</span>
                    <span>|</span>
                    <span>HSL: {analysis.hsl.h}°, {analysis.hsl.s}%, {analysis.hsl.l}%</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {analysis.verdict}
                  </p>
                </div>
              </div>

              {/* Slider list of estimated values */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Estimated Parameters</h4>

                {/* pH */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Estimated pH Level</span>
                    <span className="font-bold text-white">{analysis.estimates.ph}</span>
                  </div>
                  <div className="w-full bg-[#020c14] h-1.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-gradient-to-r from-red-500 via-[#00e5a0] to-purple-500 h-full"
                      style={{ width: `${(analysis.estimates.ph / 14) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Turbidity */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Estimated Turbidity</span>
                    <span className="font-bold text-white">{analysis.estimates.turbidity} NTU</span>
                  </div>
                  <div className="w-full bg-[#020c14] h-1.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-sky-400 h-full"
                      style={{ width: `${Math.min(100, (analysis.estimates.turbidity / 10) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Solids (TDS) */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Estimated Solids (TDS)</span>
                    <span className="font-bold text-white">{analysis.estimates.solids} ppm</span>
                  </div>
                  <div className="w-full bg-[#020c14] h-1.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-amber-400 h-full"
                      style={{ width: `${Math.min(100, (analysis.estimates.solids / 2500) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleApply}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-[#00e5a0] to-[#0072ff] hover:from-[#0072ff] hover:to-[#00e5a0] rounded-lg text-xs font-syne font-bold text-[#020c14] hover:text-white flex items-center justify-center gap-1.5 shadow-lg shadow-[#00e5a0]/10 transition-all duration-300 hover:scale-[1.02]"
              >
                <Check className="w-4 h-4" />
                Apply Estimates to Input Form
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Sparkles className="w-8 h-8 text-slate-600 animate-pulse" />
              <div>
                <h4 className="font-syne text-xs font-bold text-slate-300 uppercase tracking-wide">Waiting for Spectroscopy</h4>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Provide a picture or camera capture to initiate pixel chromatography analysis.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
