"use client";

import { X, Search, ChevronRight, Bike, MapPin, User, ArrowLeft, Navigation, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import CustomerProfileModal from "@/components/customers/CustomerProfileModal";
import DeliveryPartnerProfileModal from "@/components/delivery-partners/DeliveryPartnerProfileModal";

export default function LiveDeliveriesListModal({ isOpen, onClose, filterType, selectedItem, setSelectedItem, modalMode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [customerToView, setCustomerToView] = useState(null);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerToView, setPartnerToView] = useState(null);
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkDelivered = async (item) => {
    setIsMarking(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiBase}/admin/live-deliveries/mark-delivered`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("admin_auth_token") || localStorage.getItem("adminToken")}`
        },
        body: JSON.stringify({
          deliveryId: item.id,
          deliveryDate: item.date === "Today" ? new Date().toISOString() : new Date(Date.now() + 86400000).toISOString()
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Marked as delivered successfully");
        onClose();
        window.location.reload(); // Refresh the page to update the schedule
      } else {
        alert(data.message || "Failed to mark as delivered");
      }
    } catch (err) {
      alert("Error marking delivered");
    } finally {
      setIsMarking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Render Detail View
  if (modalMode === "direct_detail" || selectedItem) {
    const item = selectedItem;
    return (
      <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center">
              {modalMode !== "direct_detail" && (
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors mr-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-black text-slate-800">Delivery Details</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">{item.orderId}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 shadow-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-slate-50 rounded-2xl p-6 mb-6 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <div className="flex items-center">
                  <span className={`w-2.5 h-2.5 rounded-full bg-${item.statusColor}-500 mr-2 animate-pulse`}></span>
                  <p className={`text-xl font-black text-${item.statusColor}-700`}>{item.status}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ETA</p>
                <p className="text-xl font-black text-slate-800">{item.eta}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => {
                    setCustomerToView(item.customerName);
                    setProfileModalOpen(true);
                  }}
                  className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer</p>
                  <div className="flex items-center">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{item.customerName}</p>
                    <User className="w-3.5 h-3.5 text-slate-400 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div 
                  onClick={() => {
                    setPartnerToView(item.riderName);
                    setPartnerModalOpen(true);
                  }}
                  className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rider</p>
                  <div className="flex items-center">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{item.riderName}</p>
                    <Bike className="w-3.5 h-3.5 text-slate-400 ml-1.5 opacity-100 group-hover:text-teal-500 transition-colors" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 border border-slate-100 rounded-xl flex items-start">
                <MapPin className="w-5 h-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery Address</p>
                  <p className="text-sm font-medium text-slate-700">{item.address}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-wrap">
            <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
              Close
            </button>
            <button className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm flex items-center">
              <Navigation className="w-4 h-4 mr-2" />
              Live Map
            </button>
            <button 
              onClick={() => handleMarkDelivered(item)}
              disabled={isMarking}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm flex items-center disabled:opacity-70"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isMarking ? "Marking..." : "Mark Delivered"}
            </button>
          </div>
        </div>
      </div>
      <CustomerProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
        customerQuery={customerToView} 
      />
      <DeliveryPartnerProfileModal
        isOpen={partnerModalOpen}
        onClose={() => setPartnerModalOpen(false)}
        partnerQuery={partnerToView}
      />
      </>
    );
  }

  // Render List View
  const listItems = [].filter(item => {
    if (filterType === "delayed" && item.status !== "Delayed") return false;
    if (filterType === "active_deliveries" && (item.status === "Arrived" || item.status === "Delivered")) return false;
    // Mock mappings for other filters can be simple pass-throughs
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.orderId.toLowerCase().includes(q) && 
          !item.customerName.toLowerCase().includes(q) &&
          !item.riderName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 capitalize">
              {filterType.replace(/_/g, ' ')}
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">{listItems.length} records found</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 shadow-sm transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search deliveries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {listItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-sm">No items match your filter.</div>
          ) : (
            listItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors group border border-transparent hover:border-slate-100 mb-1"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{item.orderId}</h4>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5">{item.riderName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-black text-slate-800">{item.eta}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold mt-1 bg-${item.statusColor}-50 text-${item.statusColor}-700`}>
                      {item.status}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      <CustomerProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
        customerQuery={customerToView} 
      />
    </div>
  );
}
