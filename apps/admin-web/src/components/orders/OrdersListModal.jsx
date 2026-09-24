"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, ArrowLeft, MapPin, Package, CreditCard, Clock, Phone, User, Bike, Send } from "lucide-react";
export default function OrdersListModal({ isOpen, onClose, filterType, selectedOrder, setSelectedOrder, modalMode, ordersData = [], onAcceptAndDispatch }) {
  // Prevent scrolling on body when modal is open
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
      case "pending": return "Pending Orders";
      case "processing": return "Processing Orders";
      case "completed": return "Completed Orders";
      case "cancelled": return "Cancelled Orders";
      case "revenue": return "Revenue generating Orders";
      default: return "All Orders";
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "Processing": return "blue";
      case "Pending": return "orange";
      case "Completed": return "green";
      case "Cancelled": return "red";
      default: return "slate";
    }
  };

  const filteredOrders = ordersData.filter(order => {
    if (filterType === "total" || filterType === "revenue") return true;
    return order.status.toLowerCase() === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white/90 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <div className="flex items-center space-x-3">
            {selectedOrder && modalMode === "list" && (
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {selectedOrder ? `Order ${selectedOrder.id}` : getTitle()}
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1">
                {selectedOrder ? `${selectedOrder.date} at ${selectedOrder.time}` : `${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} found`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar">
          
          {!selectedOrder ? (
            /* --- LIST VIEW --- */
            filteredOrders.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-600">No orders found.</p>
                <p className="text-xs text-slate-400 mt-1">There are no orders matching this status.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOrders.map((order, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedOrder(order)}
                    className="cursor-pointer bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:-translate-y-0.5"
                  >
                    
                    {/* Left: ID & Customer */}
                    <div className="flex items-center space-x-4">
                      <img 
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${order.customer.seed}&backgroundColor=f8fafc`} 
                        alt={order.customer.name} 
                        className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50"
                      />
                      <div>
                        <h4 className="text-sm font-black text-slate-800">{order.id}</h4>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{order.customer.name}</p>
                      </div>
                    </div>

                    {/* Middle: Items & Status */}
                    <div className="flex items-center space-x-6">
                      <div className="hidden sm:block text-right">
                        <p className="text-xs font-bold text-slate-700">{order.itemCount}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">{order.product.name}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-${getStatusColor(order.status)}-50 text-${getStatusColor(order.status)}-700 border border-${getStatusColor(order.status)}-100/50`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Right: Amount & Action */}
                    <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-6 pt-3 sm:pt-0 border-t border-slate-50 sm:border-0 mt-2 sm:mt-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 mb-0.5">Amount</p>
                        <p className="text-sm font-black text-slate-800">{order.amount}</p>
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
            /* --- DETAIL VIEW --- */
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              
              {/* Customer & Delivery Status Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                <div className="flex items-start space-x-4">
                  <img 
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${selectedOrder.customer.seed}&backgroundColor=f8fafc`} 
                    alt={selectedOrder.customer.name} 
                    className="w-14 h-14 rounded-full border-2 border-slate-100 bg-slate-50"
                  />
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{selectedOrder.customer.name}</h3>
                    <div className="flex items-center text-slate-500 mt-1 space-x-4 text-xs font-bold">
                      <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1" /> {selectedOrder.customer.phone}</span>
                      <span className="flex items-center"><User className="w-3.5 h-3.5 mr-1" /> Customer</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 flex-1 md:max-w-xs border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Status</p>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${selectedOrder.delivery.iconColor}-100 text-${selectedOrder.delivery.iconColor}-600`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold text-${selectedOrder.delivery.iconColor}-700`}>{selectedOrder.delivery.status}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Rider: {selectedOrder.delivery.rider}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Items List */}
                <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                    <Package className="w-4 h-4 mr-2 text-slate-400" /> Order Items ({selectedOrder.itemCount})
                  </h4>
                  <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-300">
                      IMG
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">{selectedOrder.product.name}</p>
                      {selectedOrder.product.more && <p className="text-xs font-bold text-teal-600 mt-1">and {selectedOrder.product.more} items</p>}
                    </div>
                    <p className="text-sm font-black text-slate-800">{selectedOrder.amount}</p>
                  </div>
                </div>

                {/* Address & Payment */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400" /> Delivery Address
                    </h4>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      123 Mockup Street,<br/>
                      Building 4A, Flat 201,<br/>
                      New Delhi, 110001
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2 text-slate-400" /> Payment Info
                    </h4>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`text-xs font-bold ${selectedOrder.payment.isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                          {selectedOrder.payment.status}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">via {selectedOrder.payment.method}</p>
                      </div>
                      <span className="text-sm font-black text-slate-800">{selectedOrder.amount}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white/50 flex items-center justify-between">
          <div>
            {selectedOrder && selectedOrder.status === 'Pending' && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                Awaiting Admin Acceptance
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              Close
            </button>

            {selectedOrder && selectedOrder.status === 'Pending' && onAcceptAndDispatch && (
              <button 
                onClick={() => onAcceptAndDispatch(selectedOrder.raw?._id || selectedOrder.id)}
                className="flex items-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Bike className="w-4 h-4 mr-2" />
                Accept & Dispatch to All Riders
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
