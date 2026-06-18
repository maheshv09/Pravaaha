import React, { useState } from 'react';
import { formatNumber } from '../lib/utils';

export default function CopilotPanel({ data, hotspots, onMapAction }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'Hello! I am your Pravaaha Copilot. I can analyze parking violations, suggest enforcement routes, identify congestion root causes, and predict high-risk zones. How can I assist you today?',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const mockGroqResponse = async (userQuery) => {
    // In a real scenario with internet, this hits the FastAPI backend connected to Groq
    // For this standalone demo, we mock the logic based on the user's input string
    
    return new Promise(resolve => {
      setTimeout(() => {
        let response = "";
        let action = null;
        const lowerQuery = userQuery.toLowerCase();
        
        if (lowerQuery.includes('highest congestion') || lowerQuery.includes('worst')) {
          const top = hotspots[0];
          response = `Based on the data, the highest congestion risk is at **${top.station}** near ${top.landmark}. I have highlighted this zone on the map.`;
          action = { type: 'ZOOM_TO', lat: top.lat, lon: top.lon, zoom: 16, hotspotId: top.cellId };
        } else if (lowerQuery.includes('wrong parking') || lowerQuery.includes('wrong-parking')) {
          const wpZones = hotspots.filter(h => h.topOffense === 'WRONG_PARKING' || (h.offenses && h.offenses['WRONG_PARKING'] > 40));
          if (wpZones.length > 0) {
            response = `I've filtered the map to show zones driven primarily by Wrong Parking violations. The top zone is **${wpZones[0].station}**.`;
            action = { type: 'FILTER', filterType: 'offense', value: 'WRONG_PARKING' };
          } else {
            response = "I couldn't find a significant concentration of wrong parking in the top hotspots.";
          }
        } else if (lowerQuery.includes('predict') || lowerQuery.includes('tomorrow')) {
          response = `Looking at historical trends, I predict increased congestion in **Koramangala** and **Indiranagar** tomorrow evening. I am switching you to the Simulator to view the predictive event analysis.`;
          action = { type: 'SWITCH_TAB', tab: 'simulation' };
        } else if (lowerQuery.includes('route') || lowerQuery.includes('patrol')) {
          response = `Here is an optimized patrol route for the top 3 critical zones:\n1. Start at **${hotspots[0].station}** (${hotspots[0].landmark})\n2. Proceed to **${hotspots[1].station}** (${hotspots[1].landmark})\n3. End at **${hotspots[2].station}** (${hotspots[2].landmark})\n\nThis targets the highest ROI areas. I am switching to Mission Control to show you the full Action Plan.`;
          action = { type: 'SWITCH_TAB', tab: 'mission' };
        } else if (lowerQuery.includes('root cause') || lowerQuery.includes('why')) {
          const top = hotspots[0];
          response = `The root causes for the top hotspot (${top.station}) include:\n- ${top.rootCauses.join('\n- ')}\n\nI have focused the map on this area.`;
          action = { type: 'ZOOM_TO', lat: top.lat, lon: top.lon, zoom: 16, hotspotId: top.cellId };
        } else if (lowerQuery.includes('metro')) {
          response = `Focusing the map on Metro Station hotspots.`;
          action = { type: 'ZOOM_TO', lat: 12.9750, lon: 77.6000, zoom: 15 }; // Mock coordinate
        } else {
          response = `I analyzed the dataset of ${formatNumber(data.summary?.totalViolations)} violations. There are ${data.summary?.criticalHotspots} critical hotspots currently. You can command me to "Take me to the highest congestion area" or "Show me wrong parking zones."`;
        }
        
        resolve({ response, action });
      }, 1500);
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // If we had the FastAPI backend running, we would fetch here:
      /*
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
      */
      
      const { response: aiResponse, action } = await mockGroqResponse(userMsg);
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
      
      // Execute the Map Action if it exists (Feature 1)
      if (action) {
        if (action.type === 'SWITCH_TAB') {
          // Pass this specific action to a parent handler or just use onMapAction which handles tab switches
          setTimeout(() => onMapAction && onMapAction(action), 1500);
        } else {
          onMapAction && onMapAction(action);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Error: Could not reach the backend API." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background/50 relative">
      {/* Header */}
      <div className="h-14 border-b border-border/50 flex items-center px-6 glass shrink-0">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <span className="text-xl">🤖</span> Pravaaha Intelligence Copilot
        </h2>
        <span className="ml-auto text-xs px-2 py-1 rounded bg-pravaaha-500/20 text-pravaaha-400 border border-pravaaha-500/30">
          Powered by Llama-3.1
        </span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-2xl px-5 py-3.5 text-sm shadow-md ${
              msg.role === 'user' 
                ? 'bg-pravaaha-600 text-white rounded-br-none'
                : 'glass-card border-border/50 text-foreground rounded-bl-none'
            }`}>
              {msg.role === 'ai' && (
                <div className="flex items-center gap-2 mb-2 text-pravaaha-400 font-semibold">
                  <span>✨</span> Copilot
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-card rounded-2xl rounded-bl-none px-5 py-4 border-border/50 shadow-md">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pravaaha-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-pravaaha-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-pravaaha-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 glass border-t border-border/50 shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about hotspots, root causes, or patrol recommendations..."
            className="w-full bg-muted/30 border border-border/50 rounded-xl pl-4 pr-12 py-3.5 text-sm text-foreground outline-none focus:border-pravaaha-500/50 focus:ring-1 focus:ring-pravaaha-500/50 transition-all shadow-inner"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 bottom-2 w-10 rounded-lg bg-pravaaha-500 text-white flex items-center justify-center hover:bg-pravaaha-600 disabled:opacity-50 disabled:hover:bg-pravaaha-500 transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
        <div className="text-center mt-2">
          <p className="text-[10px] text-muted-foreground">
            Try: "Where is congestion worst right now?" or "Which zones are driven by no-parking violations?"
          </p>
        </div>
      </div>
    </div>
  );
}
