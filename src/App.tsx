/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, FormEvent } from "react";
import { 
  Utensils, 
  Settings, 
  MessageSquare, 
  Clock, 
  MapPin, 
  Coffee, 
  Plus, 
  Minus,
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
  Star,
  ShoppingBag,
  ShoppingCart,
  ClipboardList,
  CheckCircle2,
  User,
  HelpCircle,
  ArrowRight,
  Bell,
  XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RestaurantConfig, DEFAULT_CONFIG, MenuCategory, MenuItem, Order, OrderItem, OrderStatus } from "./types";
import { AIService } from "./aiService";

export default function App() {
  const [config, setConfig] = useState<RestaurantConfig>(() => {
    const saved = localStorage.getItem("resto_config");
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [activeTab, setActiveTab] = useState<"config" | "chat" | "orders">("chat");
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

  // Cart & Ordering System States
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>(() => {
    const saved = localStorage.getItem("resto_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem("resto_orders");
    return saved ? JSON.parse(saved) : [];
  });
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCustomerOrdersModal, setShowCustomerOrdersModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem("resto_phone") || "");
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem("resto_table") || "");
  const [orderNotes, setOrderNotes] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("resto_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("resto_orders", JSON.stringify(orders));
  }, [orders]);

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

  // Cart Management Helpers
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.item.id !== itemId);
    });
  };

  const deleteFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  const getCartTotal = () => {
    return cart
      .reduce((sum, item) => sum + parseFloat(item.item.price) * item.quantity, 0)
      .toFixed(2);
  };

  const placeOrder = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return;
    if (!customerPhone.trim()) {
      alert("Please enter a valid phone number for order updates.");
      return;
    }
    if (!tableNumber.trim()) {
      alert("Please enter your table number.");
      return;
    }

    const orderItems: OrderItem[] = cart.map((i) => ({
      id: i.item.id,
      name: i.item.name,
      price: i.item.price,
      quantity: i.quantity,
    }));

    const newOrder: Order = {
      id: "R-" + Math.floor(1000 + Math.random() * 9000),
      customerName: customerName.trim() || "Guest",
      customerPhone: customerPhone.trim(),
      tableNumber: tableNumber.trim(),
      items: orderItems,
      totalPrice: getCartTotal(),
      status: "Received",
      createdAt: new Date().toISOString(),
      notes: orderNotes.trim() || undefined,
    };

    localStorage.setItem("resto_phone", customerPhone.trim());
    localStorage.setItem("resto_table", tableNumber.trim());

    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setCustomerName("");
    setOrderNotes("");
    setSelectedOrderForTracking(newOrder.id);
    if (isAdmin) {
      setActiveTab("orders");
    } else {
      setShowCustomerOrdersModal(true);
    }
    setShowCheckoutModal(false);
    setShowFullMenu(false);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#1a1a1a] font-sans selection:bg-[#e6dcc6] flex flex-col md:flex-row">
      {/* Navigation Rail / Bottom Bar */}
      <nav className={`fixed bottom-0 left-0 w-full md:left-0 md:top-0 md:h-full md:w-16 bg-white border-t md:border-t-0 md:border-r border-[#ececec] flex flex-row md:flex-col items-center justify-around md:justify-start md:py-8 py-3 z-50 ${!isAdmin ? "hidden md:flex" : "flex"}`}>
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

        {isAdmin && (
          <>
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

            <button 
              onClick={() => setActiveTab("orders")}
              className={`p-3 rounded-xl md:mt-4 transition-all relative ${activeTab === "orders" ? "bg-[#f5f2ed] text-[#d2691e]" : "text-gray-400 hover:text-gray-600"}`}
              title="Manage Orders"
            >
              <ClipboardList className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#d2691e] rounded-full" />
              )}
            </button>
          </>
        )}
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

      <main className={`flex-1 ${isAdmin ? "md:ml-16 mb-20 md:mb-0" : "md:ml-16 mb-0 md:mb-0"}`}>
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
          ) : activeTab === "orders" ? (
            <motion.div
              key="orders"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen bg-[#fafaf8]"
            >
              <header className="mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-serif font-medium mb-1 flex items-center gap-2">
                    <ClipboardList className="w-7 h-7 text-[#d2691e]" />
                    {isAdmin ? "Kitchen & Order Dispatch" : "Table Order & Tracking"}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {isAdmin 
                      ? "Manage real-time guest requests, table locations, and food statuses." 
                      : "Create a direct request from your phone or trace existing orders automatically."}
                  </p>
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-2 bg-[#f2ede4] px-4 py-1.5 rounded-full border border-[#ece4d8]">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-[#d2691e] uppercase tracking-wider">Merchant Portal</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowFullMenu(true)}
                    className="flex items-center gap-2 bg-white border border-[#ececec] px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <Coffee className="w-4 h-4 text-[#d2691e]" /> Open Digital Menu
                  </button>
                )}
              </header>

              {isAdmin ? (
                /* ================= MERCHANT VIEW ================= */
                <div className="space-y-6">
                  {/* Quick Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-[#ececec] shadow-sm">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Received</p>
                      <h3 className="text-2xl font-serif font-bold text-gray-800 mt-1">
                        {orders.length} orders
                      </h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#ececec] shadow-sm">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">In Kitchen</p>
                      <h3 className="text-2xl font-serif font-bold text-amber-600 mt-1">
                        {orders.filter(o => o.status === "Preparing").length} orders
                      </h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#ececec] shadow-sm">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ready to Serve</p>
                      <h3 className="text-2xl font-serif font-bold text-green-600 mt-1">
                        {orders.filter(o => o.status === "Ready to Serve").length} orders
                      </h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#ececec] shadow-sm">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Sales</p>
                      <h3 className="text-2xl font-serif font-bold text-[#d2691e] mt-1">
                        {config.currency}
                        {orders
                          .filter(o => o.status === "Completed")
                          .reduce((sum, o) => sum + parseFloat(o.totalPrice || "0"), 0)
                          .toFixed(2)}
                      </h3>
                    </div>
                  </div>

                  {/* Orders List */}
                  <div className="bg-white rounded-3xl border border-[#ececec] shadow-sm overflow-hidden p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-serif font-medium">Recent Tickets</h2>
                      <p className="text-xs text-gray-400">Updates sync in real-time on guests' screens.</p>
                    </div>

                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="p-5 bg-[#fcfcfc] rounded-2xl border border-[#ececec] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xs transition-shadow">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="bg-[#f5f2ed] text-[#d2691e] font-serif font-bold px-3 py-1 rounded-lg text-sm">
                                Table {order.tableNumber}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">#{order.id}</span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-sm font-bold">
                              {order.customerName} <span className="font-normal text-gray-400">({order.customerPhone})</span>
                            </p>

                            {/* Ordered Items */}
                            <div className="text-xs text-gray-500 bg-white p-3 rounded-xl border border-[#f5f5f5] max-w-lg space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between">
                                  <span>{item.name} <span className="text-gray-400 font-semibold font-mono">x{item.quantity}</span></span>
                                  <span className="font-mono">{config.currency}{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                              {order.notes && (
                                <div className="mt-2 pt-2 border-t border-dashed border-gray-100 text-amber-700 italic text-[11px] bg-amber-50/50 p-2 rounded">
                                  💡 guest comment: "{order.notes}"
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:self-center">
                            <div className="text-right sm:mr-4">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Total Ticket</p>
                              <p className="text-lg font-serif font-bold text-[#d2691e]">{config.currency}{order.totalPrice}</p>
                            </div>

                            <div className="flex flex-col gap-1.5 min-w-[150px]">
                              <div className="text-xs font-bold text-center py-1.5 rounded-lg mb-1 uppercase tracking-wider text-[10px]" style={{
                                backgroundColor: 
                                  order.status === "Received" ? "#fdf4e9" : 
                                  order.status === "Preparing" ? "#fffbeb" :
                                  order.status === "Ready to Serve" ? "#f0fdf4" :
                                  order.status === "Completed" ? "#f0fdf4" : "#fef2f2",
                                color: 
                                  order.status === "Received" ? "#b45309" : 
                                  order.status === "Preparing" ? "#b45309" :
                                  order.status === "Ready to Serve" ? "#15803d" :
                                  order.status === "Completed" ? "#166534" : "#991b1b"
                              }}>
                                Status: {order.status}
                              </div>

                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  onClick={() => updateOrderStatus(order.id, "Preparing")}
                                  className="px-2 py-1 bg-white border border-gray-200 hover:bg-amber-50 rounded-md text-[10px] font-bold text-amber-700 hover:border-amber-300 transition-colors"
                                  disabled={order.status === "Preparing"}
                                >
                                  Kitchen
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, "Ready to Serve")}
                                  className="px-2 py-1 bg-white border border-gray-200 hover:bg-green-50 rounded-md text-[10px] font-bold text-green-700 hover:border-green-300 transition-colors"
                                  disabled={order.status === "Ready to Serve"}
                                >
                                  Ready
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, "Completed")}
                                  className="px-2 py-1 bg-[#166534] hover:bg-[#15803d] text-white rounded-md text-[10px] font-bold transition-colors"
                                  disabled={order.status === "Completed"}
                                >
                                  Served
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, "Cancelled")}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-[10px] font-bold transition-colors"
                                  disabled={order.status === "Cancelled"}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {orders.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                          <p className="text-sm text-gray-400">No active kitchen orders. Use the customer tracker side to place a demo order!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= CUSTOMER VIEW ================= */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Tracking orders */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-[#ececec] shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-[#f9f9f9]">
                        <h3 className="text-lg font-serif font-medium flex items-center gap-2">
                          <Bell className="w-5 h-5 text-[#d2691e]" /> Track Your Table Orders
                        </h3>
                        {/* Lookup form */}
                        <div className="flex items-center gap-1.5 bg-[#f9f9f9] border border-transparent focus-within:border-gray-200 px-3 py-1 rounded-xl transition-all">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Lookup by Phone..."
                            value={phoneSearch}
                            onChange={(e) => setPhoneSearch(e.target.value)}
                            className="bg-transparent border-none text-xs outline-none w-32 focus:ring-0 p-0"
                          />
                        </div>
                      </div>

                      {/* Display matched orders */}
                      {(() => {
                        const trackingPhone = phoneSearch.trim() || customerPhone;
                        const matched = orders.filter(
                          (o) => o.customerPhone.trim() === trackingPhone.trim() && trackingPhone.trim().length > 0
                        );

                        if (matched.length === 0) {
                          return (
                            <div className="text-center py-12 space-y-4">
                              <p className="text-sm text-gray-400">
                                {trackingPhone 
                                  ? `No orders found for phone "${trackingPhone}".` 
                                  : "Enter your mobile number above or check out your basket on the right to start."}
                              </p>
                              {orders.length > 0 && !trackingPhone && (
                                <p className="text-xs text-gray-400">
                                  Tip: Enter <span className="font-mono text-[#d2691e]">{orders[0].customerPhone}</span> in lookup box to test order status tracker!
                                </p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {matched.map((order) => (
                              <section key={order.id} className="p-5 bg-[#fafaf8] rounded-2xl border border-[#ececec]">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm bg-white px-2 py-0.5 rounded border border-gray-100">
                                        Table {order.tableNumber}
                                      </span>
                                      <span className="text-xs text-gray-500 font-mono">#{order.id}</span>
                                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {order.status}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Order Time: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Amount</p>
                                    <p className="text-base font-serif font-bold text-[#d2691e]">{config.currency}{order.totalPrice}</p>
                                  </div>
                                </div>

                                {/* Order Visual tracking stepper bar */}
                                <div className="mt-6 mb-6">
                                  <div className="relative flex justify-between">
                                    {/* Line */}
                                    <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 z-0">
                                      <div className="h-full bg-[#d2691e] transition-all duration-500" style={{
                                        width: 
                                          order.status === "Received" ? "0%" : 
                                          order.status === "Preparing" ? "33%" :
                                          order.status === "Ready to Serve" ? "66%" : "100%"
                                      }} />
                                    </div>

                                    {/* Steps */}
                                    {[
                                      { label: "Received", step: "Received" },
                                      { label: "In Kitchen", step: "Preparing" },
                                      { label: "Food Ready", step: "Ready to Serve" },
                                      { label: "Served", step: "Completed" }
                                    ].map((s, idx) => {
                                      const isPassed = 
                                        order.status === "Completed" || 
                                        (order.status === "Ready to Serve" && s.step !== "Completed") ||
                                        (order.status === "Preparing" && (s.step === "Preparing" || s.step === "Received")) ||
                                        (order.status === "Received" && s.step === "Received");
                                      const isActive = order.status === s.step;

                                      return (
                                        <div key={idx} className="flex flex-col items-center relative z-10">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                            isPassed 
                                              ? "bg-[#d2691e] text-white" 
                                              : "bg-white border-2 border-gray-200 text-gray-400"
                                          } ${isActive ? "ring-4 ring-orange-100" : ""}`}>
                                            {isPassed ? "✓" : idx + 1}
                                          </div>
                                          <span className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${
                                            isActive ? "text-[#d2691e]" : "text-gray-400"
                                          }`}>
                                            {s.label}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="bg-white p-3 rounded-xl text-xs space-y-1">
                                  <p className="font-bold text-gray-500 mb-1.5">Selected Items:</p>
                                  {order.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>{it.name} <span className="font-semibold text-gray-400">x{it.quantity}</span></span>
                                      <span className="font-mono">{config.currency}{(parseFloat(it.price) * it.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                  {order.notes && (
                                    <div className="text-[10px] text-amber-800 bg-amber-50 rounded p-1.5 mt-2">
                                      Note: "{order.notes}"
                                    </div>
                                  )}
                                </div>
                              </section>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Checkout cart */}
                  <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#ececec] shadow-sm">
                    <h3 className="text-lg font-serif font-medium flex items-center gap-2 mb-6 pb-4 border-b border-[#f9f9f9]">
                      <ShoppingCart className="w-5 h-5 text-[#d2691e]" /> Table Checkout Basket
                    </h3>

                    {cart.length > 0 ? (
                      <div className="space-y-6">
                        {/* Cart items */}
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {cart.map((cartItem) => (
                            <div key={cartItem.item.id} className="flex items-center justify-between p-3 bg-[#fafaf8] rounded-2xl border border-[#ececec]">
                              <div className="flex-1 min-w-0 pr-3">
                                <h4 className="text-xs font-bold text-gray-800 truncate">{cartItem.item.name}</h4>
                                <span className="text-[10px] text-gray-400">{config.currency}{cartItem.item.price} each</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(cartItem.item.id)}
                                  className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500 font-bold text-xs"
                                >
                                  -
                                </button>
                                <span className="text-xs font-bold text-gray-800 w-4 text-center">{cartItem.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => addToCart(cartItem.item)}
                                  className="w-6 h-6 rounded-full bg-[#d2691e] flex items-center justify-center hover:opacity-90 text-white font-bold text-xs"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteFromCart(cartItem.item.id)}
                                  className="text-gray-300 hover:text-red-500 ml-1.5 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Form details */}
                        <form onSubmit={placeOrder} className="space-y-4 pt-4 border-t border-dashed border-gray-100">
                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold ml-1">Your Name</label>
                            <input
                              type="text"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Guest Name (optional)"
                              className="w-full bg-[#fafaf8] border border-transparent rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#d2691e] outline-none transition-all mt-1"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold ml-1">Table Number *</label>
                              <input
                                type="text"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                                placeholder="e.g. 5"
                                className="w-full bg-[#fafaf8] border border-transparent rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#d2691e] outline-none transition-all mt-1 font-bold text-center"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold ml-1">Customer Phone *</label>
                              <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="Status Updates Phone"
                                className="w-full bg-[#fafaf8] border border-transparent rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#d2691e] outline-none transition-all mt-1 font-bold text-center"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold ml-1">Order Notes (optional)</label>
                            <textarea
                              value={orderNotes}
                              onChange={(e) => setOrderNotes(e.target.value)}
                              placeholder="e.g. Add extra ketchup, allergy to gluten..."
                              rows={2}
                              className="w-full bg-[#fafaf8] border border-transparent rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#d2691e] outline-none transition-all resize-none mt-1"
                            />
                          </div>

                          <div className="pt-2">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-xs font-semibold text-gray-500">Order Subtotal</span>
                              <span className="text-xl font-serif font-bold text-[#d2691e]">{config.currency}{getCartTotal()}</span>
                            </div>
                            <button
                              type="submit"
                              className="w-full bg-[#d2691e] text-white py-3 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-700/10"
                            >
                              <Utensils className="w-4 h-4" /> Place Table Order
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="text-center py-10 space-y-4">
                        <p className="text-xs text-gray-400">Select items from our menu first to draft your table order.</p>
                        
                        {/* Render quick shortcuts right here to speed up guest test sessions! */}
                        <div className="pt-4 border-t border-gray-50 text-left">
                          <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400 mb-3 block">Quick Add Dishes</p>
                          <div className="space-y-2">
                            {config.menu.flatMap(cat => cat.items).slice(0, 4).map(dish => (
                              <button
                                key={dish.id}
                                onClick={() => addToCart(dish)}
                                className="w-full bg-[#fafaf8] border border-[#ececec] hover:border-[#d2691e] p-2.5 rounded-xl text-left flex justify-between items-center text-xs transition-all active:scale-95 group"
                              >
                                <span className="font-bold text-gray-700 group-hover:text-[#d2691e] transition-colors">{dish.name}</span>
                                <span className="font-serif font-bold text-[#d2691e] flex items-center gap-1">
                                  {config.currency}{dish.price} <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-600 ml-1" />
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                      onClick={() => setShowCustomerOrdersModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#fbeee5] border border-[#f5dbca] rounded-full text-[#d2691e] hover:bg-[#f6decb] transition-all shadow-sm relative"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Track Order</span>
                      {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#d2691e] text-[9px] font-bold text-white shadow-sm">
                          {cart.reduce((sum, c) => sum + c.quantity, 0)}
                        </span>
                      )}
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
                      <div className="flex items-center gap-4 mb-8 text-center justify-center">
                        <div className="h-px flex-1 bg-[#ececec]" />
                        <h3 className="text-3xl font-serif font-medium italic text-[#d2691e] px-4">{category.name}</h3>
                        <div className="h-px flex-1 bg-[#ececec]" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mb-16">
                        {category.items.map((item) => {
                          const quantityInCart = cart.find(c => c.item.id === item.id)?.quantity || 0;
                          return (
                            <div key={item.id} className="group cursor-default flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[#fafaf8] rounded-2xl transition-all">
                               <div className="flex-1 text-left">
                                 <div className="flex items-baseline gap-2 mb-1">
                                   <h4 className="text-xl font-bold text-gray-900 group-hover:text-[#d2691e] transition-colors uppercase tracking-tight">{item.name}</h4>
                                   <div className="flex-1 border-b border-dotted border-gray-200" />
                                   <span className="text-xl font-serif font-bold text-[#d2691e] whitespace-nowrap">{config.currency}{item.price}</span>
                                 </div>
                                 <p className="text-sm text-gray-500 italic leading-relaxed">{item.description}</p>
                               </div>
                               
                               <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                 {quantityInCart > 0 ? (
                                   <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full shadow-xs">
                                     <button
                                       type="button"
                                       onClick={() => removeFromCart(item.id)}
                                       className="w-5 h-5 rounded-full bg-white flex items-center justify-center font-bold text-xs text-amber-800 border border-orange-100 hover:bg-gray-50 transition-colors shadow-xs"
                                     >
                                       -
                                     </button>
                                     <span className="text-xs font-bold text-amber-900 w-4 text-center">{quantityInCart}</span>
                                     <button
                                       type="button"
                                       onClick={() => addToCart(item)}
                                       className="w-5 h-5 rounded-full bg-[#d2691e] hover:opacity-90 flex items-center justify-center font-bold text-xs text-white transition-opacity shadow-xs"
                                     >
                                       +
                                     </button>
                                   </div>
                                 ) : (
                                   <button
                                     type="button"
                                     onClick={() => addToCart(item)}
                                     className="flex items-center gap-1 bg-white border border-[#ececec] hover:border-[#d2691e] hover:text-[#d2691e] px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95"
                                   >
                                     + Add
                                   </button>
                                 )}
                               </div>
                            </div>
                          );
                        })}
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

              {/* Cart floating bar on modal */}
              {cart.length > 0 && (
                <div className="sticky bottom-0 bg-white/95 border-t border-[#ececec] p-4 flex justify-between items-center z-50 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-xs text-gray-500">
                      You have <span className="font-bold text-gray-800">{cart.reduce((sum, c) => sum + c.quantity, 0)} items</span> in your table basket.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFullMenu(false);
                      setShowCustomerOrdersModal(true);
                    }}
                    className="bg-[#d2691e] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                  >
                    Checkout Now ({config.currency}{getCartTotal()}) <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Customer Tracking & Checkout Modal */}
      <AnimatePresence>
        {showCustomerOrdersModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] flex items-center justify-center p-0 md:p-6"
            onClick={() => setShowCustomerOrdersModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.98, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 15, opacity: 0 }}
              className="bg-[#fafaf8] w-full h-full md:max-w-6xl md:h-[90vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <header className="px-6 py-4 bg-white border-b border-[#ececec] flex items-center justify-between sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-5 h-5 text-[#d2691e]" />
                  <div>
                    <h3 className="font-serif font-medium text-sm md:text-base">Table Ordering & Status Tracker</h3>
                    <p className="text-[10px] text-gray-500">View real-time status of items dispatched from your table.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomerOrdersModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                  title="Close Tracker"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Tracking orders */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-[#ececec] shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-[#f9f9f9]">
                        <h3 className="text-base font-serif font-medium flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#d2691e]" /> Track Your Table Orders
                        </h3>
                        {/* Lookup form */}
                        <div className="flex items-center gap-1.5 bg-[#f9f9f9] border border-transparent focus-within:border-gray-200 px-3 py-1.5 rounded-xl transition-all">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Lookup by Phone..."
                            value={phoneSearch}
                            onChange={(e) => setPhoneSearch(e.target.value)}
                            className="bg-transparent border-none text-xs outline-none w-32 focus:ring-0 p-0"
                          />
                        </div>
                      </div>

                      {/* Display matched orders */}
                      {(() => {
                        const trackingPhone = phoneSearch.trim() || customerPhone;
                        const matched = orders.filter(
                          (o) => o.customerPhone.trim() === trackingPhone.trim() && trackingPhone.trim().length > 0
                        );

                        if (matched.length === 0) {
                          return (
                            <div className="text-center py-10 space-y-3">
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {trackingPhone 
                                  ? `No orders found for mobile phone "${trackingPhone}".` 
                                  : "Enter your mobile number above or fill in the checkout basket to place a new order."}
                              </p>
                              {orders.length > 0 && !trackingPhone && (
                                <p className="text-[10px] text-gray-400">
                                  Tip: Enter <span className="font-mono text-[#d2691e] font-bold">{orders[0].customerPhone}</span> in the search box to track active orders!
                                </p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {matched.map((order) => (
                              <section key={order.id} className="p-4 bg-[#fafaf8] rounded-2xl border border-[#ececec]">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-xs bg-white px-2 py-0.5 rounded border border-gray-100">
                                        Table {order.tableNumber}
                                      </span>
                                      <span className="text-xs text-gray-400 font-mono">#{order.id}</span>
                                      <span className="text-[9px] bg-orange-100 text-[#d2691e] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {order.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Time: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Amount</p>
                                    <p className="text-sm font-serif font-bold text-[#d2691e]">{config.currency}{order.totalPrice}</p>
                                  </div>
                                </div>

                                {/* Order Visual tracking stepper bar */}
                                <div className="mt-4 mb-4">
                                  <div className="relative flex justify-between">
                                    {/* Line */}
                                    <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-gray-200 z-0">
                                      <div className="h-full bg-[#d2691e] transition-all duration-500" style={{
                                        width: 
                                          order.status === "Received" ? "0%" : 
                                          order.status === "Preparing" ? "33%" :
                                          order.status === "Ready to Serve" ? "66%" : "100%"
                                      }} />
                                    </div>

                                    {/* Steps */}
                                    {[
                                      { label: "Received", step: "Received" },
                                      { label: "In Kitchen", step: "Preparing" },
                                      { label: "Food Ready", step: "Ready to Serve" },
                                      { label: "Served", step: "Completed" }
                                    ].map((s, idx) => {
                                      const isPassed = 
                                        order.status === "Completed" || 
                                        (order.status === "Ready to Serve" && s.step !== "Completed") ||
                                        (order.status === "Preparing" && (s.step === "Preparing" || s.step === "Received")) ||
                                        (order.status === "Received" && s.step === "Received");
                                      const isActive = order.status === s.step;

                                      return (
                                        <div key={idx} className="flex flex-col items-center relative z-10">
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                            isPassed 
                                              ? "bg-[#d2691e] text-white" 
                                              : "bg-white border-2 border-gray-200 text-gray-400"
                                          } ${isActive ? "ring-2 ring-orange-200" : ""}`}>
                                            {isPassed ? "✓" : idx + 1}
                                          </div>
                                          <span className={`text-[8px] mt-1.5 font-bold uppercase tracking-wider ${
                                            isActive ? "text-[#d2691e]" : "text-gray-400"
                                          }`}>
                                            {s.label}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="bg-white p-3 rounded-xl text-xs space-y-1">
                                  <p className="font-bold text-gray-500 mb-1">Kitchen Ticket Items:</p>
                                  {order.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between text-[11px]">
                                      <span>{it.name} <span className="font-semibold text-gray-400">x{it.quantity}</span></span>
                                      <span className="font-mono">{config.currency}{(parseFloat(it.price) * it.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                  {order.notes && (
                                    <div className="text-[10px] text-amber-800 bg-amber-50/75 rounded p-2 mt-2 italic">
                                      Chef request: "{order.notes}"
                                    </div>
                                  )}
                                </div>
                              </section>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Checkout cart */}
                  <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#ececec] shadow-sm">
                    <h3 className="text-base font-serif font-medium flex items-center gap-2 mb-6 pb-4 border-b border-[#f9f9f9]">
                      <ShoppingCart className="w-4 h-4 text-[#d2691e]" /> Table Checkout Basket
                    </h3>

                    {cart.length > 0 ? (
                      <div className="space-y-6">
                        {/* Cart items */}
                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                          {cart.map((cartItem) => (
                            <div key={cartItem.item.id} className="flex items-center justify-between p-3 bg-[#fafaf8] rounded-2xl border border-[#ececec]">
                              <div className="flex-1 min-w-0 pr-2">
                                <h4 className="text-xs font-bold text-gray-800 truncate">{cartItem.item.name}</h4>
                                <span className="text-[10px] text-gray-400">{config.currency}{cartItem.item.price} each</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(cartItem.item.id)}
                                  className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500 font-bold text-xs"
                                >
                                  -
                                </button>
                                <span className="text-xs font-bold text-gray-800 w-3 text-center">{cartItem.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => addToCart(cartItem.item)}
                                  className="w-5 h-5 rounded-full bg-[#d2691e] flex items-center justify-center hover:opacity-90 text-white font-bold text-xs"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteFromCart(cartItem.item.id)}
                                  className="text-gray-300 hover:text-red-500 ml-1 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Form details */}
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          placeOrder();
                          setShowCustomerOrdersModal(true);
                        }} className="space-y-3.5 pt-4 border-t border-dashed border-gray-100">
                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold ml-1">Your Name</label>
                            <input
                              type="text"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Guest Name (optional)"
                              className="w-full bg-[#fafaf8] border border-transparent rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#d2691e] outline-none transition-all mt-1"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold ml-0.5">Table Number *</label>
                              <input
                                type="text"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                                placeholder="e.g. 5"
                                className="w-full bg-[#fafaf8] border border-transparent rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#d2691e] outline-none transition-all mt-1 font-bold text-center"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold ml-0.5">Customer Phone *</label>
                              <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="For SMS updates"
                                className="w-full bg-[#fafaf8] border border-transparent rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#d2691e] outline-none transition-all mt-1 font-bold text-center"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold ml-1">Order Notes (optional)</label>
                            <textarea
                              value={orderNotes}
                              onChange={(e) => setOrderNotes(e.target.value)}
                              placeholder="e.g. Extra spicy, allergy warning..."
                              rows={2}
                              className="w-full bg-[#fafaf8] border border-transparent rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#d2691e] outline-none transition-all resize-none mt-1"
                            />
                          </div>

                          <div className="pt-2">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-semibold text-gray-500">Subtotal</span>
                              <span className="text-lg font-serif font-bold text-[#d2691e]">{config.currency}{getCartTotal()}</span>
                            </div>
                            <button
                              type="submit"
                              className="w-full bg-[#d2691e] text-white py-3 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-700/10"
                            >
                              <Utensils className="w-4 h-4" /> Place Table Order
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="text-center py-8 space-y-3">
                        <p className="text-xs text-gray-400 leading-relaxed">Your table basket is empty. Add culinary delights from our digital menu!</p>
                        
                        <div className="pt-4 border-t border-gray-100 text-left">
                          <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400 mb-2 mt-1">Quick Add Dishes</p>
                          <div className="space-y-1.5">
                            {config.menu.flatMap(cat => cat.items).slice(0, 4).map(dish => (
                              <button
                                key={dish.id}
                                onClick={() => addToCart(dish)}
                                className="w-full bg-[#fafaf8] border border-[#ececec] hover:border-[#d2691e] p-2.5 rounded-xl text-left flex justify-between items-center text-xs transition-all active:scale-95 group"
                              >
                                <span className="font-bold text-gray-700 group-hover:text-[#d2691e] transition-colors">{dish.name}</span>
                                <span className="font-serif font-bold text-[#d2691e] flex items-center gap-1">
                                  {config.currency}{dish.price} <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#d2691e] ml-1" />
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

