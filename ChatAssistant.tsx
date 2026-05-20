import React, { useState, useRef, useEffect } from 'react';
import { Send, Key, Bot, User, HelpCircle, Loader2 } from 'lucide-react';
import { WaterParameters } from '../utils/waterPredictor';

interface ChatAssistantProps {
  currentParameters: WaterParameters;
  isPotable: boolean;
  wqi: number;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  currentParameters,
  isPotable,
  wqi
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am your AI Water Quality Assistant. I've analyzed your sample parameters. Ask me anything about your water safety, what the parameters mean, health risks, or how to treat it!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Save API Key to localStorage
  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('anthropic_api_key', apiKey);
    setShowKeyInput(false);
  };

  const handleClearKey = () => {
    setApiKey('');
    localStorage.removeItem('anthropic_api_key');
  };

  // Generate offline responses based on parameters
  const generateSimulatedResponse = (question: string): string => {
    const q = question.toLowerCase();
    const { ph, hardness, solids, chloramines, sulfate, organic_carbon, trihalomethanes, turbidity } = currentParameters;

    // Report summary question
    if (q.includes('explain') || q.includes('report') || q.includes('summary') || q.includes('what does this mean')) {
      const statusText = isPotable 
        ? `POTABLE (Safe) with a WQI score of ${wqi}/100. It generally meets drinking standards.`
        : `NOT POTABLE (Unsafe) with a WQI score of ${wqi}/100. It requires treatment before consumption.`;

      const mainIssues: string[] = [];
      if (ph < 6.5) mainIssues.push(`acidic pH (${ph})`);
      if (ph > 8.5) mainIssues.push(`alkaline pH (${ph})`);
      if (solids > 1000) mainIssues.push(`excessive Total Dissolved Solids (${solids} ppm)`);
      if (turbidity > 5.0) mainIssues.push(`high turbidity (${turbidity} NTU)`);
      if (sulfate > 250) mainIssues.push(`elevated sulfate levels (${sulfate} mg/L)`);
      if (chloramines > 4.0) mainIssues.push(`high disinfectant chloramines (${chloramines} ppm)`);
      if (trihalomethanes > 80) mainIssues.push(`carcinogenic trihalomethanes (${trihalomethanes} μg/L)`);
      if (organic_carbon > 4.0) mainIssues.push(`high organic carbon (${organic_carbon} ppm)`);

      const issuesText = mainIssues.length > 0 
        ? `The primary safety violations detected are: **${mainIssues.join(', ')}**.`
        : "No violations of WHO standards were detected. The water looks excellent.";

      return `### Water Analysis Executive Summary\n\nYour water sample is classified as **${statusText}**\n\n${issuesText}\n\n**Quick Recommendations:**\n` +
             (isPotable 
              ? "- Your water is safe for normal usage. Standard carbon filtration will optimize the flavor.\n- Keep monitoring parameters seasonally." 
              : "- **DO NOT consume** this water raw.\n- If turbidity is high, apply a **sediment filter** first.\n- Use **Reverse Osmosis (RO)** to remove chemical compounds like sulfate and dissolved solids.\n- Implement **activated carbon** for disinfection byproducts (THMs) and chloramines.");
    }

    // pH question
    if (q.includes('ph') || q.includes('acid') || q.includes('alkaline')) {
      if (ph < 6.5) {
        return `### Low pH (${ph}) Danger Analysis\n\nYour water's pH of **${ph}** is below the WHO threshold of **6.5 – 8.5** (acidic).\n\n**Hazards:**\n- **Metal Leaching:** Acidic water is highly corrosive. It dissolves copper, lead, and zinc from household plumbing. Drinking lead-leached water causes neurological damage, especially in children.\n- **Sour Taste:** It has a sharp, metallic flavor.\n\n**Solution:**\nInstall an **acid neutralizing filter** containing calcite (calcium carbonate) or magnesium oxide to raise the pH to a safe, neutral level.`;
      } else if (ph > 8.5) {
        return `### High pH (${ph}) Danger Analysis\n\nYour water's pH of **${ph}** is above the WHO safe limit of **8.5** (alkaline).\n\n**Hazards:**\n- **Scale Buildup:** High pH causes calcium carbonate minerals to precipitate, clogging water pipes, heaters, and leaving chalky deposits on dishes.\n- **Slippery Feel & Bitter Taste:** The water feels soapy and has a soda-like bitter taste.\n- **Reduced Disinfection:** High pH decreases the disinfecting power of chlorine, making water more susceptible to bacteria.\n\n**Solution:**\nInject food-grade **citric acid** or use an acidic water conditioner to bring the pH back to the neutral range.`;
      } else {
        return `### Normal pH (${ph}) Analysis\n\nYour water's pH of **${ph}** falls right in the optimal range of **6.5 – 8.5**.\n\nAt this level, the water is chemically balanced, non-corrosive to plumbing, and does not cause scaling or scale deposits. Disinfection is highly effective here. No treatment is needed for pH.`;
      }
    }

    // Diseases / Pathogens question
    if (q.includes('disease') || q.includes('illness') || q.includes('sick') || q.includes('pathogen') || q.includes('bacteria') || q.includes('virus')) {
      const riskFactors = [];
      if (turbidity > 5.0) riskFactors.push("High Turbidity");
      if (organic_carbon > 4.0) riskFactors.push("Elevated TOC (Organic Carbon)");
      if (chloramines < 0.2) riskFactors.push("Low Disinfectant Residual");

      let details = "";
      if (riskFactors.length > 0) {
        details = `Your sample shows increased biological risk factors due to **${riskFactors.join(', ')}**.\n\n` +
          `**Pathogenic Risks:**\n` +
          `- **Gastroenteritis:** Bacteria like *E. coli*, *Salmonella*, or viruses could be shielded by turbidity particles, surviving disinfection.\n` +
          `- **Parasites:** *Giardia lamblia* and *Cryptosporidium* form cyst shells that resist chlorine, causing weeks of severe diarrhea, cramps, and dehydration.\n` +
          `- **Carcinogens:** High TOC reacts with chlorine to form Trihalomethanes (THMs), which are linked to increased liver/kidney cancer risks upon chronic ingestion.\n\n` +
          `**Immediate action:** Boil water for at least 1 minute or pass it through a UV sterilizer.`;
      } else {
        details = `Your water has a low biological risk profile. Turbidity is low (${turbidity} NTU) and organic carbon is safe (${organic_carbon} ppm), meaning bacteria and pathogens have no media to breed or hide. Ensure standard hygiene is maintained.`;
      }
      return `### Microbiological Health Risks\n\n${details}`;
    }

    // Turbidity question
    if (q.includes('turbidity') || q.includes('cloud') || q.includes('clarity') || q.includes('dirty')) {
      if (turbidity > 5.0) {
        return `### High Turbidity (${turbidity} NTU) Analysis\n\nYour turbidity is **${turbidity} NTU**, which violates the WHO safe drinking water limit (< 5.0 NTU, ideally < 1.0 NTU).\n\n**Why it is dangerous:**\n- **Pathogen Shielding:** Suspended clay, organic matter, and algae act as physical shields for pathogens, blocking UV light and chlorine. This prevents effective disinfection.\n- **Heavy Metals & Toxins:** Toxic chemical compounds and heavy metals often bind to clay particles, increasing toxic ingestion.\n\n**Solution:**\n1. **Sediment Prefilter:** Use a 5-micron spun polypropylene sediment filter to remove physical cloudiness.\n2. **Coagulation:** In municipal settings, alum is added to bind particles so they settle out.`;
      } else {
        return `### Optimal Turbidity (${turbidity} NTU) Analysis\n\nYour turbidity is **${turbidity} NTU**, which is fully safe. At this clarity level, the water appears crystal clear, and any disinfection treatments (like UV or Chlorination) can penetrate the water column completely to kill 99.9% of biological contaminants.`;
      }
    }

    // TDS / Solids / Hardness
    if (q.includes('tds') || q.includes('solids') || q.includes('hardness') || q.includes('mineral') || q.includes('scale')) {
      return `### TDS (${solids} ppm) & Hardness (${hardness} mg/L) Report\n\n` +
        `- **Total Dissolved Solids:** Your TDS level is **${solids} ppm**. WHO recommends < 500 ppm, and limits it to 1000 ppm. ` +
        (solids > 1000 
          ? `Your TDS is **unsafe**. High TDS signifies heavy mineral salts, agricultural runoff, or industrial leakage, which can irritate the GI tract.` 
          : `Your TDS is in a **healthy range**, ensuring a good balance of natural drinking minerals.`) + "\n\n" +
        `- **Hardness:** Hardness is **${hardness} mg/L**. ` +
        (hardness > 180 
          ? `Your water is **Very Hard**. While not a direct health hazard, it will cause lime-scaling on appliances, dry skin, and require double the soap usage.` 
          : hardness < 60 
            ? `Your water is **Soft**. It is highly sudsy, but soft water can be slightly corrosive to copper piping.` 
            : `Your water hardness is **Moderate/Optimal**, keeping pipes clean and taste fresh.`) + "\n\n" +
        `**Solution for high TDS/Hardness:** Install a **Reverse Osmosis (RO)** filtration unit to remove dissolved solids, and a **cation-exchange water softener** to eliminate hardness.`;
    }

    // Sulfate
    if (q.includes('sulfate') || q.includes('laxative') || q.includes('diarrhea')) {
      if (sulfate > 250) {
        return `### Elevated Sulfate (${sulfate} mg/L) Analysis\n\nSulfate is a naturally occurring mineral salt. Your level of **${sulfate} mg/L** exceeds the aesthetic/safety guideline of **250 mg/L**.\n\n**Effects:**\n- **Laxative Effect:** High sulfate levels in drinking water can cause a laxative effect, resulting in diarrhea and dehydration, especially for infants and newcomers.\n- **Taste:** It gives a bitter, medicinal, or salty taste.\n- **Smell:** Can support sulfur-reducing bacteria, generating a rotten egg smell (hydrogen sulfide).\n\n**Solution:**\nUse **Reverse Osmosis** or **Distillation** to filter out sulfate ions. Activated carbon filters do NOT remove sulfate.`;
      } else {
        return `### Safe Sulfate (${sulfate} mg/L) Analysis\n\nYour sulfate is **${sulfate} mg/L**, which is within the safe limit (< 250 mg/L). It will not cause GI distress or bitter tastes.`;
      }
    }

    // Default response
    return `### Water Expert Advisor Response\n\nI understand you are asking about water quality parameters. Based on your current water sample:
- **pH:** ${ph}
- **Turbidity:** ${turbidity} NTU
- **TDS (Solids):** ${solids} ppm
- **Sulfate:** ${sulfate} mg/L
- **Chloramines:** ${chloramines} ppm
- **Trihalomethanes:** ${trihalomethanes} μg/L
- **Organic Carbon:** ${organic_carbon} ppm

**Filtration Guideline:**
If your water is marked **Unsafe**, the best all-around protection is a **3-Stage Filtration System**:
1. **Sediment Filter (5-micron):** Removes turbidity, clay, and sand.
2. **Activated Carbon Block:** Adsorbs organic carbon, chlorine, chloramines, and cancer-causing THMs.
3. **Reverse Osmosis (RO) Membrane:** Eliminates dissolved solids (TDS), sulfates, and heavy metals (lead, copper).

Do you have specific questions about these filtration stages, plumbing corrosion, or any other parameter?`;
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // If API Key is present, make call to Anthropic API
    if (apiKey.trim()) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            // Note: direct browser fetch will trigger CORS error on Anthropic unless proxied
            // We catch this and gracefully fall back to local rule-based simulation.
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 800,
            messages: [
              {
                role: 'user',
                content: `You are a professional Water Quality Scientist advising a citizen. 
Current Water Sample Parameters:
- pH Level: ${currentParameters.ph} (ideal: 6.5 - 8.5)
- Hardness: ${currentParameters.hardness} mg/L (ideal: 75 - 250)
- Solids (TDS): ${currentParameters.solids} ppm (ideal: < 1000)
- Chloramines: ${currentParameters.chloramines} ppm (ideal: 0.2 - 4.0)
- Sulfate: ${currentParameters.sulfate} mg/L (ideal: < 250)
- Conductivity: ${currentParameters.conductivity} uS/cm (ideal: < 400)
- Organic Carbon: ${currentParameters.organic_carbon} ppm (ideal: < 4.0)
- Trihalomethanes: ${currentParameters.trihalomethanes} ug/L (ideal: < 80)
- Turbidity: ${currentParameters.turbidity} NTU (ideal: < 5.0)
Classification: ${isPotable ? 'Safe (Potable)' : 'Unsafe (Not Potable)'}
Water Quality Index (WQI): ${wqi}/100

Answer the user's question regarding these parameters in plain language. Be concise, scientific, and explain health effects/diseases and filter fixes.
User's Question: "${text}"`
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = await response.json();
        const replyText = data.content?.[0]?.text || "I was unable to retrieve a response from Claude.";
        
        setMessages(prev => [...prev, {
          id: `reply-${Date.now()}`,
          sender: 'bot',
          text: replyText,
          timestamp: new Date()
        }]);
      } catch (err) {
        console.warn("Anthropic API Error (likely CORS restriction or invalid key):", err);
        // Fallback to simulation
        setTimeout(() => {
          const simReply = generateSimulatedResponse(text);
          setMessages(prev => [...prev, {
            id: `reply-${Date.now()}`,
            sender: 'bot',
            text: `*(API Connection restricted. Loading Offline Water Expert Agent...)*\n\n${simReply}`,
            timestamp: new Date()
          }]);
          setIsTyping(false);
        }, 800);
        return;
      }
    } else {
      // Local Simulation Response
      setTimeout(() => {
        const replyText = generateSimulatedResponse(text);
        setMessages(prev => [...prev, {
          id: `reply-${Date.now()}`,
          sender: 'bot',
          text: replyText,
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 700);
    }
  };

  return (
    <div className="bg-[#0a2235]/70 border border-blue-500/10 rounded-2xl p-6 relative overflow-hidden flex flex-col h-[520px]">
      {/* Background orbs */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full filter blur-xl pointer-events-none"></div>

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-blue-500/10 pb-4 flex-shrink-0">
        <div>
          <h3 className="font-syne font-bold text-lg text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#00c6ff] animate-pulse" />
            AI Chat Assistant
          </h3>
          <p className="text-xs text-slate-400">Ask questions about contaminants, health hazards, and DIY treatment methods.</p>
        </div>

        {/* API Key Toggle */}
        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold font-syne transition-all ${
            apiKey ? 'border-emerald-500/30 bg-emerald-500/10 text-[#00e5a0]' : 'border-slate-800 bg-[#020c14] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          {apiKey ? 'Claude API Active' : 'Configure Claude'}
        </button>
      </div>

      {/* API KEY COLLAPSIBLE BOX */}
      {showKeyInput && (
        <form onSubmit={handleSaveKey} className="bg-[#020c14] border border-blue-500/20 rounded-xl p-4 my-3 flex-shrink-0 space-y-3 animate-[fadeIn_0.2s_ease]">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold font-syne text-[#00c6ff] uppercase tracking-wider">Anthropic API Key Setup</h4>
            {apiKey && (
              <button 
                type="button" 
                onClick={handleClearKey}
                className="text-[10px] text-red-400 hover:underline uppercase font-bold"
              >
                Clear Key
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input 
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 bg-[#061825] border border-blue-500/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#00c6ff]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-[#0072ff] to-[#00c6ff] rounded-lg text-xs font-syne font-bold text-white transition-all hover:scale-105"
            >
              Save Key
            </button>
          </div>
          <p className="text-[9px] text-slate-500 leading-relaxed">
            *Keys are stored locally in your browser cache. Direct browser requests to Anthropic may be blocked by CORS; if blocked, the assistant fallback mode will provide localized parameter explanations.
          </p>
        </form>
      )}

      {/* CHAT MESSAGES WINDOW */}
      <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-2 no-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex items-start gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${
              msg.sender === 'bot' 
                ? 'bg-blue-500/10 border-blue-500/20 text-[#00c6ff]' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-[#00e5a0]'
            }`}>
              {msg.sender === 'bot' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed border ${
              msg.sender === 'bot' 
                ? 'bg-[#061825]/90 border-blue-500/10 text-slate-200' 
                : 'bg-[#0a2235] border-emerald-500/20 text-white'
            }`}>
              {/* Simple Markdown Parsing for response */}
              {msg.text.split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('### ')) {
                  return <h4 key={index} className="font-syne font-bold text-sm text-[#00c6ff] mt-2 mb-1">{paragraph.replace('### ', '')}</h4>;
                }
                if (paragraph.startsWith('**') || paragraph.includes('**')) {
                  // highlight bold sections simply
                  const parts = paragraph.split('**');
                  return (
                    <p key={index} className="mb-2">
                      {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="text-[#00c6ff] font-bold">{p}</strong> : p)}
                    </p>
                  );
                }
                if (paragraph.startsWith('- ')) {
                  return (
                    <ul key={index} className="list-disc pl-4 space-y-1 mb-2">
                      {paragraph.split('\n').map((li, lIdx) => (
                        <li key={lIdx}>{li.replace('- ', '')}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={index} className="mb-2">{paragraph}</p>;
              })}
            </div>
          </div>
        ))}

        {/* Bot Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#00c6ff] flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#061825]/90 border border-blue-500/10 rounded-2xl px-4 py-3 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 text-[#00c6ff] animate-spin" />
              <span className="text-[10px] text-slate-500 font-syne font-bold tracking-widest uppercase animate-pulse">Analyzing context...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* QUICK SUGGESTIONS ROW */}
      <div className="flex gap-2 overflow-x-auto pb-3 flex-shrink-0 no-scrollbar">
        <button
          onClick={() => handleSend("Explain my water quality analysis report.")}
          className="flex-shrink-0 px-3 py-1.5 bg-[#020c14] hover:bg-[#00c6ff]/10 border border-blue-500/15 rounded-full text-[10px] font-syne font-bold text-slate-300 hover:text-[#00c6ff] transition-all flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3 text-[#00c6ff]" />
          Explain Report
        </button>
        <button
          onClick={() => handleSend("Why is my pH dangerous or unbalanced?")}
          className="flex-shrink-0 px-3 py-1.5 bg-[#020c14] hover:bg-[#00c6ff]/10 border border-blue-500/15 rounded-full text-[10px] font-syne font-bold text-slate-300 hover:text-[#00c6ff] transition-all flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3 text-[#00c6ff]" />
          pH Danger?
        </button>
        <button
          onClick={() => handleSend("What pathogens and diseases can this water cause?")}
          className="flex-shrink-0 px-3 py-1.5 bg-[#020c14] hover:bg-[#00c6ff]/10 border border-blue-500/15 rounded-full text-[10px] font-syne font-bold text-slate-300 hover:text-[#00c6ff] transition-all flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3 text-[#00c6ff]" />
          Diseases / Pathogens?
        </button>
        <button
          onClick={() => handleSend("How do I fix or filter this specific sample?")}
          className="flex-shrink-0 px-3 py-1.5 bg-[#020c14] hover:bg-[#00c6ff]/10 border border-blue-500/15 rounded-full text-[10px] font-syne font-bold text-slate-300 hover:text-[#00c6ff] transition-all flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3 text-[#00c6ff]" />
          Filtration Fixes?
        </button>
      </div>

      {/* INPUT FORM */}
      <div className="flex gap-2 flex-shrink-0 border-t border-blue-500/10 pt-3">
        <input
          type="text"
          placeholder="Ask a question about water safety..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
          className="flex-1 bg-[#020c14] border border-blue-500/15 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#00c6ff] placeholder:text-slate-500"
        />
        <button
          onClick={() => handleSend(inputText)}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#0072ff] to-[#00c6ff] hover:from-[#00c6ff] hover:to-[#0072ff] text-white flex items-center justify-center transition-all hover:scale-105"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
