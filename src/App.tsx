/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { 
  Utensils, 
  Settings, 
  MessageSquare, 
  Clock, 
  MapPin, 
  Coffee, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Send, 
  ChefHat, 
  ExternalLink,
  Instagram,
  Phone,
  Mail,
  Wifi,
  Baby,
  Dog,
  Accessibility,
  Wallet,
  X,
  Eye,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RestaurantConfig, DEFAULT_CONFIG, MenuCategory, MenuItem } from "./types";
import { AIService } from "./aiService";

export default function App() {
  const [config, setConfig] = useState<RestaurantConfig>(() => {
    const saved = localStorage.getItem("resto_config");
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [activeTab, setActiveTab] = useState<"config" | "chat">("chat");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [showStoreInfo, setShowStoreInfo] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const aiRef = useRef<AIService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem("resto_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    // Only initialize when switching to chat or if already in chat and null
    if (activeTab === "chat" && !aiRef.current) {
      aiRef.current = new AIService(config);
    }
  }, [activeTab, config]);

  const updateConfigField = (field: keyof RestaurantConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    aiRef.current = null; 
  };

  const updateHours = (day: string, field: keyof typeof config.openingHours[string], value: any) => {
    setConfig(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: { ...prev.openingHours[day], [field]: value }
      }
    }));
    aiRef.current = null;
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    const historyContext = messages.slice(-10); // Send last 10 messages for context
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInputMessage("");
    setIsTyping(true);

    if (aiRef.current) {
      let botResponse = "";
      setMessages((prev) => [...prev, { role: "bot", text: "" }]);
      
      try {
        await aiRef.current.sendMessageStream(userMsg, historyContext, (chunk) => {
          botResponse += chunk;
          setMessages((prev) => {
            const lastOne = prev[prev.length - 1];
            if (lastOne && lastOne.role === "bot") {
              const updated = [...prev];
              updated[updated.length - 1] = { ...lastOne, text: botResponse };
              return updated;
            }
            return prev;
          });
        }, abortControllerRef.current.signal);
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("Chat aborted");
        } else {
          console.error("Chat error:", error);
        }
      }
    }
    setIsTyping(false);
  };

  const clearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setIsTyping(false);
  };

  const handleLogin = () => {
    // Simple demo password check
    if (loginPassword === "admin123") {
      setIsAdmin(true);
      setShowLoginModal(false);
      setActiveTab("config");
      setLoginPassword("");
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setActiveTab("chat");
  };

  const addMenuCategory = () => {
    const newCat: MenuCategory = { 
      id: Math.random().toString(36).substr(2, 9), 
      name: "New Category", 
      items: [] 
    };
    setConfig(prev => ({ ...prev, menu: [...prev.menu, newCat] }));
  };

  const addMenuItem = (catId: string) => {
    const newItem: MenuItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: "New Dish",
      description: "Description...",
      price: "10.00",
      dietaryTags: []
    };
    setConfig(prev => ({
      ...prev,
      menu: prev.menu.map(cat => cat.id === catId ? { ...cat, items: [...cat.items, newItem] } : cat)
    }));
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#1a1a1a] font-sans selection:bg-[#e6dcc6] flex flex-col md:flex-row">
      {/* Navigation Rail / Bottom Bar */}
      <nav className="fixed bottom-0 left-0 w-full md:left-0 md:top-0 md:h-full md:w-16 bg-white border-t md:border-t-0 md:border-r border-[#ececec] flex flex-row md:flex-col items-center justify-around md:justify-start md:py-8 py-3 z-50">
        <div className="hidden md:block mb-12">
          <Utensils className="w-8 h-8 text-[#d2691e]" />
        </div>
        
        {isAdmin ? (
          <>
            <button 
              onClick={() => setActiveTab("config")}
              className={`p-3 rounded-xl md:mb-4 transition-all ${activeTab === "config" ? "bg-[#f5f2ed] text-[#d2691e]" : "text-gray-400 hover:text-gray-600"}`}
              title="Configuration"
            >
              <Settings className="w-6 h-6" />
            </button>
            <button 
              onClick={() => handleLogout()}
              className="p-3 rounded-xl md:mb-4 text-gray-400 hover:text-red-500 transition-all"
              title="Logout"
            >
              <ExternalLink className="w-6 h-6 md:rotate-180" />
            </button>
          </>
        ) : (
          <button 
            onClick={() => setShowLoginModal(true)}
            className="p-3 rounded-xl md:mb-4 text-gray-400 hover:text-[#d2691e] transition-all"
            title="Admin Login"
          >
            <Settings className="w-6 h-6" />
          </button>
        )}

        <button 
          onClick={() => {
            setActiveTab("chat");
            if (messages.length === 0) {
                 setMessages([{ role: "bot", text: `Welcome to ${config.restaurantName}! 😊 I'm ${config.agentName}, your virtual host. Whether you're planning a visit, curious about our menu, or need help with a reservation — I'm here. What can I help you with today?` }]);
            }
          }}
          className={`p-3 rounded-xl transition-all ${activeTab === "chat" ? "bg-[#f5f2ed] text-[#d2691e]" : "text-gray-400 hover:text-gray-600"}`}
          title="Host Chat"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </nav>

      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-serif font-medium mb-6">Admin Login</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">Access Password</label>
                  <input 
                    type="password" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Enter password..."
                    className={`w-full bg-[#f9f9f9] border-none rounded-xl px-4 py-3 focus:ring-2 outline-none transition-all ${loginError ? "ring-2 ring-red-400" : "focus:ring-[#d2691e]"}`}
                    autoFocus
                  />
                  {loginError && <p className="text-red-400 text-[10px] mt-2 font-bold uppercase tracking-wider">Invalid credentials</p>}
                </div>
                <button 
                  onClick={handleLogin}
                  className="w-full bg-[#d2691e] text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all active:scale-95"
                >
                  Access Configuration
                </button>
                <p className="text-[10px] text-center text-gray-400 italic">
                  Demo Credentials: admin123
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 md:ml-16 mb-20 md:mb-0">
        <AnimatePresence mode="wait">
          {activeTab === "config" ? (
            <motion.div 
              key="config"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 md:p-8 max-w-4xl mx-auto"
            >
              <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-4xl font-serif font-medium mb-2">Configure Your Concierge</h1>
                  <p className="text-sm md:text-base text-gray-500">Fill in your restaurant details to train your AI virtual host.</p>
                </div>
                <button 
                  onClick={() => setShowFullMenu(true)}
                  className="flex items-center gap-2 bg-white border border-[#ececec] px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Eye className="w-4 h-4 text-[#d2691e]" /> Preview Live Menu
                </button>
              </header>
              <section className="space-y-6 md:space-y-8">
                {/* Basic Info & Branding */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#ececec] shadow-sm">
                  <h2 className="text-xl font-serif font-medium flex items-center gap-2 mb-6">
                    <ChefHat className="w-5 h-5 text-[#d2691e]" /> Host Persona & Branding
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">AI Agent Name</label>
                      <input 
                        type="text" 
                        value={config.agentName}
                        onChange={(e) => updateConfigField("agentName", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                        placeholder="e.g., Bella"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Restaurant Name</label>
                      <input 
                        type="text" 
                        value={config.restaurantName}
                        onChange={(e) => updateConfigField("restaurantName", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                        placeholder="e.g., The Roasted Bean"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Restaurant Type</label>
                      <input 
                        type="text" 
                        value={config.restaurantType}
                        onChange={(e) => updateConfigField("restaurantType", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                        placeholder="e.g., Cozy neighbourhood café"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Conversation Tone</label>
                      <select 
                        value={config.tone}
                        onChange={(e) => updateConfigField("tone", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all cursor-pointer appearance-none"
                      >
                        <option value="warm and conversational">Warm & Conversational</option>
                        <option value="professional and polished">Professional & Polished</option>
                        <option value="fun and laid-back">Fun & Laid-back</option>
                        <option value="fast-paced and energetic">Fast-paced & Energetic</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Personality Traits</label>
                      <input 
                        type="text" 
                        value={config.personality || ""}
                        onChange={(e) => updateConfigField("personality", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                        placeholder="e.g., friendly, efficient, witty"
                      />
                    </div>
                  </div>
                </div>

                {/* Operations: Hours & Reservations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hours */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#ececec] shadow-sm">
                    <h2 className="text-xl font-serif font-medium flex items-center gap-2 mb-6">
                      <Clock className="w-5 h-5 text-[#d2691e]" /> Opening Hours
                    </h2>
                    <div className="space-y-3">
                      {(Object.entries(config.openingHours) as [string, any][]).map(([day, h]) => (
                        <div key={day} className="flex items-center justify-between py-2 group">
                          <span className="text-sm font-medium capitalize w-20 text-gray-600">{day.slice(0, 3)}</span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={h.isClosed}
                                onChange={(e) => updateHours(day, "isClosed", e.target.checked)}
                                className="w-4 h-4 rounded text-[#d2691e] border-gray-300 focus:ring-[#d2691e]"
                              />
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Closed</span>
                            </label>
                            {!h.isClosed && (
                              <div className="flex items-center gap-1.5 bg-[#f9f9f9] px-2 py-1 rounded-lg border border-[#f5f5f5] group-hover:border-gray-200 transition-colors">
                                <input 
                                  type="time" 
                                  value={h.open} 
                                  onChange={(e) => updateHours(day, "open", e.target.value)}
                                  className="bg-transparent border-none text-[10px] font-bold focus:ring-0 p-0 w-12"
                                />
                                <span className="text-gray-300 text-[10px]">—</span>
                                <input 
                                  type="time" 
                                  value={h.close} 
                                  onChange={(e) => updateHours(day, "close", e.target.value)}
                                  className="bg-transparent border-none text-[10px] font-bold focus:ring-0 p-0 w-12"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reservations */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#ececec] shadow-sm flex flex-col">
                    <h2 className="text-xl font-serif font-medium flex items-center gap-2 mb-6">
                      <Wallet className="w-5 h-5 text-[#d2691e]" /> Reservations & Pricing
                    </h2>
                    <div className="space-y-6 flex-1">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Price Range</label>
                        <input 
                          type="text" 
                          value={config.priceRange}
                          onChange={(e) => updateConfigField("priceRange", e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                          placeholder="e.g., $15 - $30 per person"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Reservation Policy</label>
                        <textarea 
                          value={config.reservations}
                          onChange={(e) => updateConfigField("reservations", e.target.value)}
                          rows={2}
                          className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all resize-none text-sm"
                          placeholder="e.g., Recommended for dinner, walk-ins welcome..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Method</label>
                        <input 
                          type="text" 
                          value={config.reservationMethod}
                          onChange={(e) => updateConfigField("reservationMethod", e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                          placeholder="e.g., Website, OpenTable, or Phone"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Currency Type</label>
                        <div className="flex gap-2">
                          {["$", "£", "€", "₹", "¥"].map((curr) => (
                            <button
                              key={curr}
                              onClick={() => updateConfigField("currency", curr)}
                              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${config.currency === curr ? "bg-[#d2691e] text-white" : "bg-[#f9f9f9] text-gray-400 hover:bg-gray-100"}`}
                            >
                              {curr}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location & Social */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#ececec] shadow-sm">
                  <h2 className="text-xl font-serif font-medium flex items-center gap-2 mb-6">
                    <MapPin className="w-5 h-5 text-[#d2691e]" /> Location & Reach
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Display Address</label>
                      <input 
                        type="text" 
                        value={config.address}
                        onChange={(e) => updateConfigField("address", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Phone</label>
                      <input 
                        type="text" 
                        value={config.phone}
                        onChange={(e) => updateConfigField("phone", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Website URL</label>
                      <input 
                        type="text" 
                        value={config.website}
                        onChange={(e) => updateConfigField("website", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Instagram (@)</label>
                      <input 
                        type="text" 
                        value={config.instagram}
                        onChange={(e) => updateConfigField("instagram", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Email</label>
                      <input 
                        type="text" 
                        value={config.email}
                        onChange={(e) => updateConfigField("email", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Amenities & Accessibility */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#ececec] shadow-sm">
                  <h2 className="text-xl font-serif font-medium flex items-center gap-2 mb-6">
                    <Accessibility className="w-5 h-5 text-[#d2691e]" /> Amenities & Policies
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Wifi */}
                    <div className="p-4 bg-[#fcfcfc] rounded-2xl border border-[#f5f5f5] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-[#d2691e]" />
                          <span className="text-xs font-bold text-gray-600">Guest WiFi</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={config.wifi}
                          onChange={(e) => updateConfigField("wifi", e.target.checked)}
                          className="w-4 h-4 rounded text-[#d2691e] border-gray-300"
                        />
                      </div>
                      {config.wifi && (
                        <input 
                          type="text"
                          value={config.wifiPassword}
                          onChange={(e) => updateConfigField("wifiPassword", e.target.value)}
                          placeholder="Password"
                          className="w-full bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-[#d2691e]"
                        />
                      )}
                    </div>

                    {/* Kid Friendly */}
                    <div className="p-4 bg-[#fcfcfc] rounded-2xl border border-[#f5f5f5] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Baby className="w-4 h-4 text-[#d2691e]" />
                        <span className="text-xs font-bold text-gray-600">Kid Friendly</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={config.kidFriendly}
                        onChange={(e) => updateConfigField("kidFriendly", e.target.checked)}
                        className="w-4 h-4 rounded text-[#d2691e] border-gray-300"
                      />
                    </div>

                    {/* Accessibility */}
                    <div className="p-4 bg-[#fcfcfc] rounded-2xl border border-[#f5f5f5] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Accessibility className="w-4 h-4 text-[#d2691e]" />
                        <span className="text-xs font-bold text-gray-600">Accessible</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={config.wheelchairAccessible}
                        onChange={(e) => updateConfigField("wheelchairAccessible", e.target.checked)}
                        className="w-4 h-4 rounded text-[#d2691e] border-gray-300"
                      />
                    </div>

                    {/* Pet Friendly */}
                    <div className="p-4 bg-[#fcfcfc] rounded-2xl border border-[#f5f5f5] space-y-3">
                      <div className="flex items-center gap-2">
                        <Dog className="w-4 h-4 text-[#d2691e]" />
                        <span className="text-xs font-bold text-gray-600">Pet Policy</span>
                      </div>
                      <input 
                        type="text"
                        value={config.petFriendly}
                        onChange={(e) => updateConfigField("petFriendly", e.target.value)}
                        placeholder="e.g., Outdoor only"
                        className="w-full bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-[#d2691e]"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Parking</label>
                      <input 
                        type="text" 
                        value={config.parking}
                        onChange={(e) => updateConfigField("parking", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                        placeholder="e.g., Free street parking, Validated valet..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1">Seating Styles</label>
                      <input 
                        type="text" 
                        value={config.seating}
                        onChange={(e) => updateConfigField("seating", e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-transparent rounded-2xl px-4 py-3 focus:bg-white focus:border-[#d2691e] outline-none transition-all"
                        placeholder="e.g., Indoor booths, High-tops, Patio..."
                      />
                    </div>
                  </div>
                </div>

                {/* Signature Dishes Editor */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#ececec] shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h2 className="text-xl font-serif font-medium flex items-center gap-2">
                        <Star className="w-5 h-5 text-[#d2691e]" /> Signature Dishes
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">Highlight your most popular items in the full menu view.</p>
                    </div>
                    <button 
                      onClick={() => updateConfigField("signatureDishes", [...config.signatureDishes, "New Dish — Description"])}
                      className="flex items-center gap-2 bg-[#fdfaf6] text-[#d2691e] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#f8f1e7] border border-[#f0e8dc] transition-all"
                    >
                      <Plus className="w-4 h-4" /> Add Signature
                    </button>
                  </div>

                  <div className="space-y-4">
                    {config.signatureDishes.map((dish, idx) => {
                      const [name, ...descParts] = dish.split(" — ");
                      const desc = descParts.join(" — ");
                      
                      return (
                        <div key={idx} className="flex gap-4 items-start bg-[#fcfcfc] p-4 rounded-2xl border border-[#f5f5f5]">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Dish Name</label>
                              <input 
                                type="text"
                                value={name}
                                onChange={(e) => {
                                  const newSigns = [...config.signatureDishes];
                                  newSigns[idx] = `${e.target.value} — ${desc}`;
                                  updateConfigField("signatureDishes", newSigns);
                                }}
                                className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm font-bold focus:border-[#d2691e] outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Short Highlight</label>
                              <input 
                                type="text"
                                value={desc}
                                onChange={(e) => {
                                  const newSigns = [...config.signatureDishes];
                                  newSigns[idx] = `${name} — ${e.target.value}`;
                                  updateConfigField("signatureDishes", newSigns);
                                }}
                                className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 italic focus:border-[#d2691e] outline-none"
                                placeholder="Why is it special?"
                              />
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const newSigns = [...config.signatureDishes];
                              newSigns.splice(idx, 1);
                              updateConfigField("signatureDishes", newSigns);
                            }}
                            className="mt-6 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    {config.signatureDishes.length === 0 && (
                      <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-sm text-gray-400">No signature dishes added yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Menu Editor */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#ececec] shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h2 className="text-xl font-serif font-medium flex items-center gap-2">
                        <Coffee className="w-5 h-5 text-[#d2691e]" /> Menu Knowledge Base
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">Organize your offerings to help the AI answer menu guestions.</p>
                    </div>
                    <button 
                      onClick={addMenuCategory}
                      className="flex items-center gap-2 bg-[#f5f2ed] text-[#d2691e] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#ece6da] transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> Add Category
                    </button>
                  </div>

                  <div className="space-y-12">
                    {config.menu.map((cat, catIdx) => (
                      <div key={cat.id} className="relative">
                        <div className="flex items-center gap-4 mb-6">
                          <input 
                            type="text"
                            value={cat.name}
                            onChange={(e) => {
                              const newMenu = [...config.menu];
                              newMenu[catIdx].name = e.target.value;
                              updateConfigField("menu", newMenu);
                            }}
                            className="text-xl font-serif font-medium bg-transparent border-b border-dashed border-[#ececec] focus:border-[#d2691e] focus:ring-0 outline-none pb-1 transition-all"
                          />
                          <button 
                            onClick={() => addMenuItem(cat.id)}
                            className="bg-gray-50 text-gray-400 p-1.5 rounded-lg hover:text-[#d2691e] hover:bg-[#fefce8] transition-all"
                            title="Add item to this category"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => {
                               const newMenu = [...config.menu];
                               newMenu.splice(catIdx, 1);
                               updateConfigField("menu", newMenu);
                             }}
                             className="ml-auto text-gray-300 hover:text-red-400 transition-colors"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {cat.items.map((item, itemIdx) => (
                            <motion.div 
                              layout
                              key={item.id} 
                              className="bg-[#fcfcfc] p-4 rounded-2xl border border-[#f5f5f5] hover:border-gray-200 transition-all group"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <input 
                                  value={item.name}
                                  onChange={(e) => {
                                    const newMenu = [...config.menu];
                                    newMenu[catIdx].items[itemIdx].name = e.target.value;
                                    updateConfigField("menu", newMenu);
                                  }}
                                  className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 p-0 text-[#1a1a1a]"
                                  placeholder="Item Name"
                                />
                                <div className="flex items-center bg-white px-2 py-0.5 rounded-lg border border-gray-100 ml-2">
                                  <span className="text-[10px] text-gray-300 mr-1">{config.currency}</span>
                                  <input 
                                    value={item.price}
                                    onChange={(e) => {
                                      const newMenu = [...config.menu];
                                      newMenu[catIdx].items[itemIdx].price = e.target.value;
                                      updateConfigField("menu", newMenu);
                                    }}
                                    className="bg-transparent border-none text-[10px] font-bold focus:ring-0 p-0 w-12 text-[#d2691e]"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <textarea 
                                value={item.description}
                                onChange={(e) => {
                                  const newMenu = [...config.menu];
                                  newMenu[catIdx].items[itemIdx].description = e.target.value;
                                  updateConfigField("menu", newMenu);
                                }}
                                rows={2}
                                className="w-full bg-transparent border-none text-[10px] text-gray-400 focus:ring-0 p-0 resize-none leading-relaxed"
                                placeholder="Brief description of the dish..."
                              />
                              <div className="flex justify-end items-center mt-3 pt-3 border-t border-[#f8f8f8]">
                                <button 
                                  onClick={() => {
                                    const newMenu = [...config.menu];
                                    newMenu[catIdx].items.splice(itemIdx, 1);
                                    updateConfigField("menu", newMenu);
                                  }}
                                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-40" /> {/* Spacer */}
              </section>

              {/* Floating Action Bar */}
              <div className="fixed bottom-20 md:bottom-8 left-0 md:left-16 right-0 flex justify-center px-4 pointer-events-none z-40">
                <div className="bg-white/80 backdrop-blur-md border border-[#ececec] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-6 pointer-events-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Live Training</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200" />
                    <button 
                        onClick={() => {
                            setActiveTab("chat");
                            if (messages.length === 0) {
                                setMessages([{ role: "bot", text: `I've updated my knowledge with your latest changes! I'm ${config.agentName} from ${config.restaurantName}. How can I assist you now?` }]);
                            } else {
                                setMessages(prev => [...prev, { role: "bot", text: "Knowledge base synchronized! Testing mode active." }]);
                            }
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-[#d2691e] hover:opacity-80 transition-opacity"
                    >
                        <MessageSquare className="w-4 h-4" /> Test AI Host
                    </button>
                    <div className="w-px h-4 bg-gray-200" />
                    <button 
                         onClick={() => {
                             setIsSaving(true);
                             setTimeout(() => setIsSaving(false), 1500);
                         }}
                         className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-black transition-colors"
                    >
                        {isSaving ? "Syncing..." : "Sync Knowledge"}
                    </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex h-[calc(100vh-5rem)] md:h-screen bg-white"
            >
              {/* Chat View */}
              <div className="flex-1 flex flex-col max-w-2xl mx-auto border-x border-[#ececec] overflow-hidden">
                <header className="px-4 md:px-6 py-3 md:py-4 border-b border-[#ececec] flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#f5f2ed] flex items-center justify-center text-[#d2691e]">
                      <ChefHat className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h3 className="font-serif font-medium leading-tight text-sm md:text-base">{config.agentName}</h3>
                      <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-[#d2691e] font-bold">Virtual Host</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowFullMenu(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#fdfaf6] border border-[#f0e8dc] rounded-full text-[#d2691e] hover:bg-[#f8f1e7] transition-all shadow-sm"
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Full Menu</span>
                    </button>
                    <button 
                      onClick={clearChat}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Clear Chat History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setShowStoreInfo(true)}
                      className="lg:hidden p-2 text-gray-400 hover:text-[#d2691e] transition-colors"
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#f5f2ed] rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">Online</span>
                    </div>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
                  {messages.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-12 md:py-20 space-y-8"
                    >
                       <div className="w-20 h-20 bg-[#fdfaf6] rounded-3xl mx-auto flex items-center justify-center text-[#d2691e] shadow-sm transform -rotate-3">
                         <ChefHat className="w-10 h-10" />
                       </div>
                       <div className="max-w-xs mx-auto">
                         <h4 className="text-xl md:text-2xl font-serif font-medium">Welcome to {config.restaurantName}</h4>
                         <p className="text-sm text-gray-500 mt-3 leading-relaxed">I'm {config.agentName}, your host. How may I help you today?</p>
                       </div>
                       <button 
                         onClick={() => setShowFullMenu(true)}
                         className="mx-auto flex items-center gap-3 bg-[#1a1a1a] text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-black/10 group"
                       >
                         <Coffee className="w-5 h-5 text-[#d2691e] group-hover:scale-110 transition-transform" />
                         Browse Our Menu
                       </button>
                    </motion.div>
                  )}
                  {messages.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] px-5 py-3 rounded-3xl ${
                        msg.role === "user" 
                        ? "bg-[#d2691e] text-white rounded-tr-none" 
                        : "bg-[#f9f9f9] text-[#1a1a1a] rounded-tl-none border border-[#ececec]"
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-[#f9f9f9] px-5 py-3 rounded-3xl rounded-tl-none border border-[#ececec]">
                        <div className="flex gap-1.5">
                          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75" />
                          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-3 md:p-6 bg-white border-t border-[#ececec] z-10">
                  <div className="relative flex items-center bg-[#f9f9f9] rounded-xl md:rounded-2xl px-3 md:px-4 py-1 border border-transparent focus-within:border-[#d2691e] transition-all shadow-sm">
                    <input 
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Ask about menu, reservations..."
                      className="flex-1 bg-transparent border-none outline-none py-2 text-sm h-10 md:h-12"
                    />
                    <button 
                      onClick={handleSendMessage}
                      className="p-1.5 md:p-2 ml-2 bg-[#d2691e] text-white rounded-lg md:rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                      disabled={isTyping || !inputMessage.trim()}
                    >
                      <Send className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                  <p className="text-[8px] md:text-[10px] text-center text-gray-400 mt-2 md:mt-4 leading-relaxed uppercase tracking-wider font-medium">
                    Designed by Tanishk.
                  </p>
                </div>
              </div>

              {/* Mobile Store Info Modal */}
              <AnimatePresence>
                {showStoreInfo && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-4"
                    onClick={() => setShowStoreInfo(false)}
                  >
                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-serif font-medium">Store Information</h3>
                        <button onClick={() => setShowStoreInfo(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-[#d2691e]" />
                          <div className="text-sm">
                            <p className="font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
                            <p className="text-gray-500">
                              {config.openingHours[new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]?.isClosed 
                                ? 'Closed' 
                                : `${config.openingHours[new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]?.open} - ${config.openingHours[new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]?.close}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-[#d2691e]" />
                          <div className="text-sm">
                            <p className="font-semibold">Location</p>
                            <p className="text-gray-500">{config.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-[#d2691e]" />
                          <div className="text-sm">
                            <p className="font-semibold">Contact</p>
                            <p className="text-gray-500">{config.phone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 pt-4">
                        <a href={config.website} target="_blank" className="text-center p-3 bg-[#f5f2ed] rounded-xl text-sm font-semibold text-[#d2691e]">Visit Website</a>
                        <button onClick={() => setShowStoreInfo(false)} className="text-center p-3 text-gray-400 text-sm">Close</button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sidebar Info */}
              <div className="hidden lg:flex w-80 flex-col bg-[#fafaf8] border-l border-[#ececec] p-8 space-y-8">
                <div>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-4">Store Card</h4>
                    <div className="bg-white p-5 rounded-2xl border border-[#ececec] shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-[#d2691e]" />
                            <div className="text-xs">
                                <p className="font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
                                <p className="text-gray-500">{config.openingHours[new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]?.isClosed ? 'Closed' : `${config.openingHours[new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]?.open} - ${config.openingHours[new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]?.close}`}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-[#d2691e]" />
                            <div className="text-xs">
                                <p className="font-semibold">Location</p>
                                <p className="text-gray-500 break-words">{config.address}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-[#d2691e]" />
                            <div className="text-xs">
                                <p className="font-semibold">Reservations</p>
                                <p className="text-gray-500">{config.phone}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-4">Quick Links</h4>
                    <div className="space-y-2">
                        <a href={config.website} target="_blank" className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#ececec] text-xs font-semibold hover:bg-[#f5f2ed] transition-colors">
                            Official Website <ExternalLink className="w-3 h-3" />
                        </a>
                        <a href={`https://instagram.com/${config.instagram.replace('@', '')}`} target="_blank" className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#ececec] text-xs font-semibold hover:bg-[#f5f2ed] transition-colors">
                            Instagram Profile <Instagram className="w-3 h-3" />
                        </a>
                    </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dedicated Attractive Full Menu View Overlay */}
        <AnimatePresence>
          {showFullMenu && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl flex flex-col"
            >
              <div className="p-6 flex justify-between items-center border-b border-[#f5f5f5]">
                <div className="flex items-center gap-3">
                  <ChefHat className="w-6 h-6 text-[#d2691e]" />
                  <h2 className="text-2xl font-serif font-medium">{config.restaurantName} Menu</h2>
                </div>
                <button 
                  onClick={() => setShowFullMenu(false)}
                  className="p-2 bg-[#fcfcfc] rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20 text-center">
                <div className="max-w-4xl mx-auto space-y-16">
                  {/* Signature Dishes Section */}
                  {config.signatureDishes.length > 0 && (
                    <section className="bg-[#fdfaf6] p-8 md:p-12 rounded-[32px] border border-[#f0e8dc] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Star className="w-32 h-32 text-[#d2691e] rotate-12" />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex flex-col items-center gap-3 mb-10">
                          <div className="flex items-center gap-2 text-[#d2691e] bg-white px-4 py-1.5 rounded-full border border-[#f0e8dc] shadow-sm">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Our Favorites</span>
                            <Star className="w-3 h-3 fill-current" />
                          </div>
                          <h3 className="text-4xl md:text-5xl font-serif font-medium italic">Chef's Signatures</h3>
                        </div>
                        
                        <div className="space-y-8">
                          {config.signatureDishes.map((dish, i) => {
                            const [name, ...descParts] = dish.split(" — ");
                            const desc = descParts.join(" — ");
                            return (
                              <div key={i} className="max-w-2xl mx-auto">
                                <h4 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">{name}</h4>
                                {desc && <p className="text-lg text-gray-500 italic leading-relaxed">{desc}</p>}
                                {i < config.signatureDishes.length - 1 && (
                                  <div className="w-12 h-px bg-[#d2691e]/20 mx-auto mt-8" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  )}

                  {config.menu.map((category) => (
                    <section key={category.id}>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-[#ececec]" />
                        <h3 className="text-3xl font-serif font-medium italic text-[#d2691e] px-4 text-center">{category.name}</h3>
                        <div className="h-px flex-1 bg-[#ececec]" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                        {category.items.map((item) => (
                          <div key={item.id} className="group cursor-default">
                             <div className="flex justify-between items-baseline gap-2 mb-1">
                               <h4 className="text-2xl font-bold text-gray-900 group-hover:text-[#d2691e] transition-colors uppercase tracking-tight">{item.name}</h4>
                               <div className="flex-1 border-b border-dotted border-gray-300" />
                               <span className="text-2xl font-serif font-bold text-[#d2691e] whitespace-nowrap">{config.currency}{item.price}</span>
                             </div>
                             <p className="text-base text-gray-500 italic text-left leading-relaxed">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                  
                  <div className="pt-20 text-center space-y-4">
                    <p className="text-sm text-gray-400 font-medium uppercase tracking-[0.2em]">{config.address}</p>
                    <div className="flex justify-center gap-6 text-gray-400">
                       <span className="text-xs font-bold text-black border-b-2 border-[#d2691e] pb-1">{config.phone}</span>
                       <span className="text-xs font-bold text-black border-b-2 border-[#d2691e] pb-1">{config.website}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

