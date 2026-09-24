"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Search, Send, User, Truck, Check, CheckCheck, XCircle, 
  ArrowLeft, Phone, Clock, MessageSquare, Headphones, Bike, 
  RotateCcw, Sparkles, Filter, RefreshCw
} from "lucide-react";
import io from "socket.io-client";
import { fetchWithAuth } from "@/lib/api";
import { useSearchParams } from "next/navigation";

const formatDividerDate = (dateString) => {
  if (!dateString) return "";
  const msgDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msgDay = new Date(msgDate);
  msgDay.setHours(0, 0, 0, 0);
  
  const diffTime = today - msgDay;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return msgDate.toLocaleDateString(undefined, { weekday: 'long' });
  }
  return msgDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [roleSection, setRoleSection] = useState("all"); // "all" | "customer" | "delivery"
  const [ticketStatusFilter, setTicketStatusFilter] = useState("open"); // "open" | "closed"
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChatMobile, setShowChatMobile] = useState(false);
  const messagesEndRef = useRef(null);
  const searchParams = useSearchParams();
  const selectedTicketIdRef = useRef(selectedTicketId);

  useEffect(() => {
    selectedTicketIdRef.current = selectedTicketId;
  }, [selectedTicketId]);

  const loadTickets = async () => {
    try {
      const data = await fetchWithAuth('/tickets');
      if (data && data.success) {
        setTickets(data.tickets || []);
        return data.tickets || [];
      }
      return [];
    } catch (err) {
      console.error("Failed to load tickets", err);
      return [];
    }
  };

  const loadTicketHistory = async (ticketId, isSilent = false) => {
    if (!ticketId) return;
    if (!isSilent) setChatLoading(true);
    try {
      const data = await fetchWithAuth(`/tickets/${ticketId}/messages`);
      if (data && data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load ticket history", err);
    } finally {
      if (!isSilent) setChatLoading(false);
    }
  };

  // 1. Initialize Socket.IO connection ONCE on mount
  useEffect(() => {
    const token = typeof window !== "undefined" 
      ? (localStorage.getItem('admin_auth_token') || localStorage.getItem('adminToken')) 
      : null;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: { token }
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to support socket server");
      if (selectedTicketIdRef.current) {
        newSocket.emit("join_ticket", selectedTicketIdRef.current);
      }
    });

    newSocket.on("receive_message", (message) => {
      const currentSelected = selectedTicketIdRef.current;
      if (currentSelected && String(message.ticketId) === String(currentSelected)) {
        setMessages((prev) => {
          if (!prev.find(m => String(m._id) === String(message._id))) {
            return [...prev, message];
          }
          return prev;
        });

        // If admin is actively looking at this ticket, mark incoming message as read immediately
        if (message.senderId !== 'admin') {
          newSocket.emit("mark_as_read", { ticketId: currentSelected });
        }
      }

      // Refresh ticket list to update lastMessage and unread flags
      loadTickets();
    });

    newSocket.on("messages_read", (data) => {
      const currentSelected = selectedTicketIdRef.current;
      if (currentSelected && String(data?.ticketId) === String(currentSelected)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === 'admin' ? { ...m, isRead: true } : m
          )
        );
      }
      loadTickets();
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // 2. Load tickets on mount & handle URL query parameters
  useEffect(() => {
    loadTickets().then((loadedTickets) => {
      setLoading(false);
      const ticketIdFromUrl = searchParams.get('ticketId');
      const userIdFromUrl = searchParams.get('userId');
      const sectionFromUrl = searchParams.get('section');
      const roleFromUrl = searchParams.get('role');

      let targetTicket = null;
      if (ticketIdFromUrl) {
        targetTicket = loadedTickets.find(t => String(t._id) === String(ticketIdFromUrl));
      }
      if (!targetTicket && userIdFromUrl) {
        targetTicket = loadedTickets.find(t => String(t.userId) === String(userIdFromUrl));
      }

      if (targetTicket) {
        // Automatically switch section to match the clicked notification ticket's role
        const isDelivery = targetTicket.user?.role === 'delivery';
        setRoleSection(isDelivery ? 'delivery' : 'customer');
        setTicketStatusFilter(targetTicket.status || 'open');
        setSelectedTicketId(targetTicket._id);
        setShowChatMobile(true);
      } else if (roleFromUrl || sectionFromUrl) {
        const sec = (roleFromUrl || sectionFromUrl) === 'delivery' ? 'delivery' : (roleFromUrl || sectionFromUrl) === 'customer' ? 'customer' : 'all';
        setRoleSection(sec);
        const firstMatching = loadedTickets.find(t => {
          if (t.status !== 'open') return false;
          if (sec === 'delivery') return t.user?.role === 'delivery';
          if (sec === 'customer') return t.user?.role !== 'delivery';
          return true;
        });
        if (firstMatching) {
          setSelectedTicketId(firstMatching._id);
        } else {
          setSelectedTicketId(null);
        }
      } else if (loadedTickets?.length > 0 && !selectedTicketIdRef.current) {
        // Automatically select the first open ticket and switch to its section
        const firstOpen = loadedTickets.find(t => t.status === 'open');
        if (firstOpen) {
          const isDelivery = firstOpen.user?.role === 'delivery';
          setRoleSection(isDelivery ? 'delivery' : 'customer');
          setSelectedTicketId(firstOpen._id);
        } else {
          setSelectedTicketId(loadedTickets[0]._id);
        }
      }
    });
  }, [searchParams]);

  // 3. Load full chat history & manage ticket room when ticket changes
  useEffect(() => {
    if (selectedTicketId) {
      loadTicketHistory(selectedTicketId);

      if (socket) {
        socket.emit("join_ticket", selectedTicketId);
        socket.emit("mark_as_read", { ticketId: selectedTicketId });
        setTickets(prev => prev.map(t => {
          if (String(t._id) === String(selectedTicketId) && t.lastMessage) {
            return { ...t, lastMessage: { ...t.lastMessage, isRead: true } };
          }
          return t;
        }));
      }

      // Silent sync interval every 3 seconds for 100% real-time reliability
      const interval = setInterval(() => {
        loadTicketHistory(selectedTicketId, true);
      }, 3000);

      return () => {
        clearInterval(interval);
        if (socket) {
          socket.emit("leave_ticket", selectedTicketId);
        }
      };
    } else {
      setMessages([]);
    }
  }, [selectedTicketId, socket]);

  // 4. Auto scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSectionChange = (section) => {
    setRoleSection(section);
    // Find matching tickets in the newly selected section
    const matching = tickets.filter(t => {
      if (t.status !== ticketStatusFilter) return false;
      const isDelivery = t.user?.role === 'delivery';
      if (section === 'customer' && isDelivery) return false;
      if (section === 'delivery' && !isDelivery) return false;
      return true;
    });

    if (matching.length > 0) {
      setSelectedTicketId(matching[0]._id);
    } else {
      setSelectedTicketId(null);
    }
  };

  const handleStatusFilterChange = (status) => {
    setTicketStatusFilter(status);
    const matching = tickets.filter(t => {
      if (t.status !== status) return false;
      const isDelivery = t.user?.role === 'delivery';
      if (roleSection === 'customer' && isDelivery) return false;
      if (roleSection === 'delivery' && !isDelivery) return false;
      return true;
    });

    if (matching.length > 0) {
      setSelectedTicketId(matching[0]._id);
    } else {
      setSelectedTicketId(null);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedTicketId || !socket) return;
    
    const activeTicket = tickets.find(t => String(t._id) === String(selectedTicketId));
    if (!activeTicket || activeTicket.status === 'closed') return;

    const messageData = {
      receiverId: activeTicket.userId,
      text: text,
      ticketId: selectedTicketId
    };
    
    socket.emit("send_message", messageData);
    setInputText("");
  };

  const closeTicket = async () => {
    if (!selectedTicketId) return;
    try {
      const data = await fetchWithAuth(`/tickets/${selectedTicketId}/close`, { method: 'PATCH' });
      if (data && data.success) {
        await loadTickets();
      }
    } catch (err) {
      console.error("Failed to close ticket", err);
    }
  };

  const reopenTicket = async () => {
    if (!selectedTicketId) return;
    try {
      const data = await fetchWithAuth(`/tickets/${selectedTicketId}/reopen`, { method: 'PATCH' });
      if (data && data.success) {
        await loadTickets();
      }
    } catch (err) {
      console.error("Failed to reopen ticket", err);
    }
  };

  // Section Counts
  const customerTickets = useMemo(() => {
    return tickets.filter(t => t.user?.role !== 'delivery');
  }, [tickets]);

  const deliveryTickets = useMemo(() => {
    return tickets.filter(t => t.user?.role === 'delivery');
  }, [tickets]);

  const customerOpenCount = useMemo(() => {
    return customerTickets.filter(t => t.status === 'open').length;
  }, [customerTickets]);

  const deliveryOpenCount = useMemo(() => {
    return deliveryTickets.filter(t => t.status === 'open').length;
  }, [deliveryTickets]);

  // Filtered tickets based on section, status, and search
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // 1. Status Filter (open / closed)
      if (t.status !== ticketStatusFilter) return false;

      // 2. Section / Role Filter (customer / delivery / all)
      const isDelivery = t.user?.role === 'delivery';
      if (roleSection === 'customer' && isDelivery) return false;
      if (roleSection === 'delivery' && !isDelivery) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = t.subject?.toLowerCase().includes(q);
        const matchesName = t.user?.displayName?.toLowerCase().includes(q);
        const matchesEmail = t.user?.email?.toLowerCase().includes(q);
        const matchesPhone = t.user?.phone?.toLowerCase().includes(q);
        const matchesMsg = t.lastMessage?.text?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesName && !matchesEmail && !matchesPhone && !matchesMsg) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, roleSection, ticketStatusFilter, searchQuery]);

  // Keep selectedTicketId aligned with the current filtered list
  useEffect(() => {
    if (loading) return;
    if (filteredTickets.length > 0) {
      const exists = filteredTickets.some(t => String(t._id) === String(selectedTicketId));
      if (!exists) {
        setSelectedTicketId(filteredTickets[0]._id);
      }
    }
  }, [filteredTickets, loading, selectedTicketId]);

  // Selected ticket
  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return filteredTickets.find(t => String(t._id) === String(selectedTicketId)) || 
           tickets.find(t => String(t._id) === String(selectedTicketId)) || 
           null;
  }, [filteredTickets, tickets, selectedTicketId]);

  const isSelectedDelivery = selectedTicket?.user?.role === 'delivery';

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Support</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Helpdesk
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Real-time assistance, tickets, and communication with customers and delivery partners.
          </p>
        </div>

        {/* Section Quick Summary Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSectionChange("customer")}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
              roleSection === "customer"
                ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:border-teal-300"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>User Support</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${
              roleSection === "customer" ? "bg-teal-700 text-white" : "bg-teal-50 text-teal-700 font-extrabold"
            }`}>
              {customerOpenCount} open
            </span>
          </button>

          <button
            onClick={() => handleSectionChange("delivery")}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
              roleSection === "delivery"
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Delivery Support</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${
              roleSection === "delivery" ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-700 font-extrabold"
            }`}>
              {deliveryOpenCount} open
            </span>
          </button>
        </div>
      </div>

      {/* Main Interface Container */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex min-h-0">
        
        {/* Left Sidebar: Tickets / Conversations */}
        <div className={`w-full md:w-80 lg:w-[380px] border-r border-slate-200 flex flex-col shrink-0 h-full bg-slate-50/50 ${showChatMobile ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Top Sections Switcher: User vs Delivery (plus All) */}
          <div className="p-3 border-b border-slate-200 bg-white space-y-2.5 shrink-0">
            
            {/* The 2 Primary Sections: User and Delivery */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => handleSectionChange("all")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  roleSection === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>All</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${roleSection === "all" ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-600"}`}>
                  {tickets.length}
                </span>
              </button>

              <button
                onClick={() => handleSectionChange("customer")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  roleSection === "customer"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-teal-600"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Users</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${roleSection === "customer" ? "bg-teal-700 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {customerTickets.length}
                </span>
              </button>

              <button
                onClick={() => handleSectionChange("delivery")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  roleSection === "delivery"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-amber-600"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${roleSection === "delivery" ? "bg-amber-700 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {deliveryTickets.length}
                </span>
              </button>
            </div>

            {/* Status Filter: Open vs Closed */}
            <div className="flex gap-2 items-center justify-between">
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleStatusFilterChange("open")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    ticketStatusFilter === "open"
                      ? "bg-teal-50 text-teal-700 border border-teal-200 font-bold"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  Open Tickets
                </button>
                <button
                  onClick={() => handleStatusFilterChange("closed")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    ticketStatusFilter === "closed"
                      ? "bg-slate-200 text-slate-800 border border-slate-300 font-bold"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Closed
                </button>
              </div>

              <span className="text-[11px] font-medium text-slate-400">
                {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder={`Search ${roleSection === 'customer' ? 'users' : roleSection === 'delivery' ? 'delivery partners' : 'all'} tickets...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
          
          {/* Ticket List */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs font-medium">Loading tickets...</p>
              </div>
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map(ticket => {
                const isDelivery = ticket.user?.role === 'delivery';
                const isSelected = String(selectedTicketId) === String(ticket._id);
                const hasUnread = ticket.lastMessage?.senderId === ticket.userId && !ticket.lastMessage?.isRead;
                const displayName = ticket.user?.displayName || ticket.user?.email || "Unknown User";

                return (
                  <div 
                    key={ticket._id}
                    onClick={() => {
                      if (String(selectedTicketId) === String(ticket._id)) {
                        loadTicketHistory(ticket._id);
                      } else {
                        setSelectedTicketId(ticket._id);
                      }
                      setShowChatMobile(true);
                    }}
                    className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors border-b border-slate-100 ${
                      isSelected ? 'bg-teal-50/70 border-l-4 border-l-teal-600' : 'hover:bg-slate-100/60'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden ${
                        isDelivery ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-teal-100 text-teal-700 border border-teal-200'
                      }`}>
                        {ticket.user?.photoUrl ? (
                          <img src={ticket.user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          ticket.user?.displayName ? ticket.user.displayName.substring(0, 2).toUpperCase() : (isDelivery ? 'DP' : 'CU')
                        )}
                      </div>
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-bold text-slate-800 truncate pr-2">
                          {ticket.subject}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {ticket.lastMessage ? new Date(ticket.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {displayName}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          isDelivery ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-teal-100 text-teal-700 border border-teal-200'
                        }`}>
                          {isDelivery ? 'Delivery Partner' : 'Customer'}
                        </span>
                      </div>

                      <p className={`text-xs truncate ${hasUnread ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                        {ticket.lastMessage 
                          ? (ticket.lastMessage.senderId === 'admin' ? 'You: ' + ticket.lastMessage.text : ticket.lastMessage.text) 
                          : 'No messages yet'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600 mb-1">
                  {roleSection === 'customer' 
                    ? `No ${ticketStatusFilter} user tickets.` 
                    : roleSection === 'delivery' 
                    ? `No ${ticketStatusFilter} delivery partner tickets.`
                    : `No ${ticketStatusFilter} tickets.`}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  {roleSection === 'customer'
                    ? 'When a customer raises a support ticket from the Nilara mobile app, it will appear here in real time.'
                    : roleSection === 'delivery'
                    ? 'When a delivery partner raises a support ticket from the Nilara delivery app, it will appear here in real time.'
                    : 'New support tickets raised from the user or delivery apps will appear here in real time.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Active Chat Window */}
        <div className={`flex-col min-w-0 md:flex md:flex-1 md:h-full md:bg-slate-50/30 md:relative md:inset-auto md:z-auto ${showChatMobile ? 'flex fixed inset-0 z-[60] bg-white' : 'hidden'}`}>
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="px-4 md:px-6 py-3.5 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowChatMobile(false)}
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors -ml-1"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 ${
                    isSelectedDelivery ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-teal-100 text-teal-700 border border-teal-200'
                  }`}>
                    {selectedTicket.user?.photoUrl ? (
                      <img src={selectedTicket.user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      selectedTicket.user?.displayName ? selectedTicket.user.displayName.substring(0, 2).toUpperCase() : (isSelectedDelivery ? 'DP' : 'CU')
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                        {selectedTicket.user?.displayName || selectedTicket.user?.email || 'User'}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelectedDelivery ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}>
                        {isSelectedDelivery ? 'Delivery Partner' : 'Customer'}
                      </span>
                      {selectedTicket.status === 'closed' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          Closed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Open
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-700">{selectedTicket.subject}</span>
                      {selectedTicket.user?.phone && (
                        <>
                          <span>•</span>
                          <a href={`tel:${selectedTicket.user.phone}`} className="hover:text-teal-600 flex items-center gap-1 font-medium">
                            <Phone className="w-3 h-3" />
                            {selectedTicket.user.phone}
                          </a>
                        </>
                      )}
                      {selectedTicket.user?.email && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline text-slate-400">{selectedTicket.user.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    type="button"
                    onClick={() => selectedTicketId && loadTicketHistory(selectedTicketId)}
                    title="Refresh messages"
                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${chatLoading ? 'animate-spin text-teal-600' : ''}`} />
                  </button>

                  {selectedTicket.status === 'open' ? (
                    <button 
                      onClick={closeTicket}
                      className="flex items-center px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Close Ticket
                    </button>
                  ) : (
                    <button 
                      onClick={reopenTicket}
                      className="flex items-center px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Reopen Ticket
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-4">
                <div className="max-w-4xl mx-auto w-full space-y-4">
                  {chatLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-xs font-medium">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs font-semibold text-slate-600 mb-1">No messages yet</p>
                      <p className="text-[11px] text-slate-400">Type a message below to start chatting with {selectedTicket.user?.displayName || 'the user'}.</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === 'admin';
                      const showDate = idx === 0 || formatDividerDate(messages[idx - 1].createdAt) !== formatDividerDate(msg.createdAt);

                      return (
                        <React.Fragment key={msg._id || idx}>
                          {showDate && (
                            <div className="flex justify-center my-3">
                              <span className="px-3 py-1 bg-slate-200/70 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                {formatDividerDate(msg.createdAt)}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${isMe ? 'order-1' : 'order-2'}`}>
                              <div className={`p-3.5 rounded-2xl ${
                                isMe 
                                  ? 'bg-slate-900 text-white rounded-tr-sm shadow-sm' 
                                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                              }`}>
                                <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-1 text-[10px] font-medium text-slate-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span>
                                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                {isMe && (
                                  msg.isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-teal-400" title="Seen by user" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-slate-400" title="Sent / Delivered" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat Input */}
              {selectedTicket.status === 'open' ? (
                <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-200 shrink-0">
                  <div className="max-w-4xl mx-auto flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                    <input 
                      type="text" 
                      placeholder={`Reply to ${selectedTicket.user?.displayName || 'user'}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 bg-transparent border-none px-3 py-1.5 text-sm font-medium focus:outline-none placeholder:text-slate-400"
                    />
                    <button 
                      type="submit"
                      disabled={!inputText.trim()}
                      className="w-9 h-9 flex items-center justify-center bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
                  <span>This support ticket is closed.</span>
                  <button 
                    onClick={reopenTicket}
                    className="text-teal-600 hover:underline font-bold"
                  >
                    Click here to reopen
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                <Headphones className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Select a Support Ticket</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose a {roleSection === 'customer' ? 'user' : roleSection === 'delivery' ? 'delivery partner' : 'customer or delivery'} ticket from the list to view the conversation and reply in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
