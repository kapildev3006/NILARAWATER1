"use client";

import { useEffect } from "react";
import { X, ExternalLink, ArrowLeft, Calendar, Pencil, Clock, MapPin, Truck, Bike } from "lucide-react";

export default function SubscriptionListModal({ isOpen, onClose, filterType, selectedItem, setSelectedItem, modalMode, setModalMode, onEditClick, onAssignDriverClick }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const getTitle = () => {
    switch(filterType) {
      case "total_subscriptions": return "Total Subscriptions";
      case "active_subscriptions": return "Active Subscriptions";
      case "monthly_revenue": return "High Value Subscriptions";
      case "paused_subscriptions": return "Paused Subscriptions";
      case "cancelled_subscriptions": return "Cancelled Subscriptions";
      case "new_this_month": return "New Subscriptions";
      default: return "Subscriptions Overview";
    }
  };

  const filteredItems = [].filter(item => {
    if (filterType === "total_subscriptions" || filterType === "monthly_revenue") return true;
    if (filterType === "active_subscriptions") return item.status === "Active";
    if (filterType === "new_this_month") return item.status === "New";
    if (filterType === "paused_subscriptions") return item.status === "Paused";
    if (filterType === "cancelled_subscriptions") return item.status === "Cancelled";
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white/90 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <div className="flex items-center space-x-3">
            {selectedItem && modalMode === "detail" && (
              <button 
                onClick={() => { setSelectedItem(null); setModalMode("list"); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {modalMode === "detail" ? "Subscription Details" : getTitle()}
              </h2>
              {modalMode === "list" && (
                <p className="text-xs font-bold text-teal-600 mt-0.5">{filteredItems.length} subscriptions found</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">

            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 bg-slate-50/50">
          {modalMode === "list" ? (
            filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No subscriptions found</h3>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                {filteredItems.map((item, idx) => (
                  <div key={idx} onClick={() => { setSelectedItem(item); setModalMode("detail"); }}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-100 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between group"
                  >
                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                      <div className="w-12 h-12 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-xl font-bold text-slate-500 flex-shrink-0">
                        {item.customerName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 leading-tight">{item.customerName}</h4>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{item.planName}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="hidden sm:block text-right">
                        <p className="text-xs font-bold text-slate-700">{item.frequency}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">Started {item.startDate}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-${item.statusColor}-50 text-${item.statusColor}-700 border border-${item.statusColor}-100/50`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-6 pt-3 sm:pt-0 border-t border-slate-50 sm:border-0 mt-2 sm:mt-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 mb-0.5">Price/Del.</p>
                        <p className="text-sm font-black text-slate-800">₹{item.price}</p>
                      </div>
                      <button className="w-8 h-8 flex items-center justify-center rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-full border-4 border-slate-50 bg-slate-100 flex items-center justify-center text-4xl font-bold text-slate-400 flex-shrink-0 shadow-inner">
                  {selectedItem.customerName.charAt(0)}
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-800">{selectedItem.customerName}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">{selectedItem.phone}</p>
                      <div className="flex items-center mt-3 space-x-3">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                          {selectedItem.id}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-${selectedItem.statusColor}-50 text-${selectedItem.statusColor}-700 border border-${selectedItem.statusColor}-100/50`}>
                          <span className={`w-1.5 h-1.5 rounded-full bg-${selectedItem.statusColor}-500 mr-1`}></span>
                          {selectedItem.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 min-w-[140px]">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Per Delivery</p>
                      <p className="text-2xl font-black text-slate-800">₹{selectedItem.price}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-slate-400" /> Subscription Details
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <span className="text-xs font-semibold text-slate-500">Plan</span>
                      <span className="text-sm font-black text-slate-800 text-right">{selectedItem.planName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <span className="text-xs font-semibold text-slate-500">Frequency</span>
                      <span className="text-xs font-bold text-slate-700">{selectedItem.frequency}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <span className="text-xs font-semibold text-slate-500">Start Date</span>
                      <span className="text-xs font-bold text-slate-700">{new Date(selectedItem.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <span className="text-xs font-semibold text-slate-500">Next Delivery</span>
                      <span className={`text-xs font-bold ${selectedItem.status === 'Paused' || selectedItem.status === 'Cancelled' ? 'text-red-500' : 'text-teal-600'}`}>
                        {selectedItem.nextDelivery}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <span className="text-xs font-semibold text-slate-500">Delivery Time</span>
                      <span className="text-xs font-bold text-slate-700">{selectedItem.deliveryTime}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-500 mt-0.5">Skipped Dates</span>
                      <div className="text-right flex flex-col items-end gap-1">
                        {selectedItem.skippedDeliveries && selectedItem.skippedDeliveries.length > 0 ? (
                          selectedItem.skippedDeliveries.map((date, idx) => (
                            <span key={idx} className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                              {new Date(date).toLocaleDateString()}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                    <Truck className="w-4 h-4 mr-2 text-slate-400" /> Delivery Info
                  </h4>
                  
                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block">Assigned Rider</span>
                        <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                          <Bike className="w-3.5 h-3.5 text-teal-600" />
                          {selectedItem.driverName && selectedItem.driverName !== 'Unassigned' ? selectedItem.driverName : 'No Rider Assigned'}
                        </span>
                      </div>
                      <button
                        onClick={() => onAssignDriverClick && onAssignDriverClick(selectedItem)}
                        className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition-colors shadow-sm"
                      >
                        {selectedItem.driverName && selectedItem.driverName !== 'Unassigned' ? 'Change Rider' : 'Assign Rider'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <span className="text-xs font-semibold text-slate-500">Payment Method</span>
                      <span className="text-xs font-bold text-slate-700 uppercase">{selectedItem.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <span className="text-xs font-semibold text-slate-500">Leave at Door</span>
                      <span className={`text-xs font-bold ${selectedItem.leaveAtDoor ? 'text-teal-600' : 'text-slate-400'}`}>
                        {selectedItem.leaveAtDoor ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                      <span className="text-xs font-semibold text-slate-500">Call Before Delivery</span>
                      <span className={`text-xs font-bold ${selectedItem.callBeforeDelivery ? 'text-teal-600' : 'text-slate-400'}`}>
                        {selectedItem.callBeforeDelivery ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="pt-2 flex-1">
                      <span className="text-xs font-semibold text-slate-500 block mb-2">Delivery Address</span>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[5rem] flex flex-col items-center justify-center text-center">
                        <p className="text-xs font-medium text-slate-800">{selectedItem.address?.street}</p>
                        {selectedItem.address?.apartment && <p className="text-xs text-slate-600">{selectedItem.address.apartment}</p>}
                        {selectedItem.address?.landmark && <p className="text-xs text-slate-500 mt-1 italic">Landmark: {selectedItem.address.landmark}</p>}
                      </div>
                      
                      {selectedItem.specialInstructions && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Special Instructions</span>
                          <p className="text-xs font-medium text-amber-800">{selectedItem.specialInstructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white/50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors shadow-sm">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
