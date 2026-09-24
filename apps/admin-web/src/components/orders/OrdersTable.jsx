"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Filter, Calendar, SlidersHorizontal, Eye, MoreVertical, Wallet, CreditCard, Banknote, MapPin, Bike, XCircle, Clock } from "lucide-react";
export default function OrdersTable({ ordersData = [], loading = false, setSelectedOrder, setIsModalOpen, setModalMode, onAcceptAndDispatch, onAssignDriverClick }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [selectedDeliveryStatuses, setSelectedDeliveryStatuses] = useState([]);
  const [selectedAmountRange, setSelectedAmountRange] = useState(null);
  
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case "Processing": return "blue";
      case "Pending": return "orange";
      case "Completed": return "green";
      case "Cancelled": return "red";
      default: return "slate";
    }
  };

  const getPaymentIcon = (method) => {
    switch(method) {
      case "UPI": return <Wallet className="w-3.5 h-3.5" />;
      case "Card": return <CreditCard className="w-3.5 h-3.5" />;
      case "Pending": return <Banknote className="w-3.5 h-3.5" />;
      default: return <Banknote className="w-3.5 h-3.5" />;
    }
  };

  const getDeliveryIcon = (status) => {
    switch(status) {
      case "On the way": return <Bike className="w-3.5 h-3.5" />;
      case "Delivered": return <MapPin className="w-3.5 h-3.5" />;
      case "Pending": return <Clock className="w-3.5 h-3.5" />; // Assuming Clock is imported, but let's use a simple div if not or XCircle for Cancelled
      case "Cancelled": return <XCircle className="w-3.5 h-3.5" />;
      default: return <MapPin className="w-3.5 h-3.5" />;
    }
  };

  const filteredOrders = ordersData.filter(order => {
    // 1. Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = order.id.toLowerCase().includes(q) ||
                            order.customer.name.toLowerCase().includes(q) ||
                            order.product.name.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    
    // 2. Status filter
    if (selectedStatuses.length > 0) {
      if (!selectedStatuses.includes(order.status)) return false;
    }
    
    // 3. Payment filter
    if (selectedPayments.length > 0) {
      if (!selectedPayments.includes(order.payment.status)) return false;
    }
    
    // 4. Delivery Status filter
    if (selectedDeliveryStatuses.length > 0) {
      if (!selectedDeliveryStatuses.includes(order.delivery.status)) return false;
    }
    
    // 5. Amount Range filter
    if (selectedAmountRange) {
      const amountValue = parseInt(order.amount.replace(/[^0-9]/g, ''), 10);
      if (selectedAmountRange === "Under ₹100" && amountValue >= 100) return false;
      if (selectedAmountRange === "₹100 - ₹500" && (amountValue < 100 || amountValue > 500)) return false;
      if (selectedAmountRange === "Over ₹500" && amountValue <= 500) return false;
    }
    
    return true;
  });

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col">
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center gap-4 relative">
        
        {/* Search and Filters */}
        <div ref={dropdownRef} className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by order ID, customer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-medium placeholder-slate-400"
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'filter' ? null : 'filter')}
              className={`flex items-center px-4 py-2 border rounded-xl text-sm font-bold whitespace-nowrap shadow-sm transition-colors ${activeDropdown === 'filter' || selectedStatuses.length > 0 || selectedPayments.length > 0 ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Filter className={`w-4 h-4 mr-2 ${activeDropdown === 'filter' || selectedStatuses.length > 0 || selectedPayments.length > 0 ? 'text-teal-600' : 'text-slate-400'}`} />
              Filter
              {(selectedStatuses.length > 0 || selectedPayments.length > 0) && (
                <span className="ml-2 w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">
                  {selectedStatuses.length + selectedPayments.length}
                </span>
              )}
            </button>
            
            {activeDropdown === 'filter' && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] border border-slate-100 p-4 z-30 animate-in fade-in slide-in-from-top-2">
                <div className="mb-5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Order Status</h4>
                  <div className="space-y-2.5">
                    {["Pending", "Processing", "Completed", "Cancelled"].map(s => (
                      <label key={s} className="flex items-center space-x-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={selectedStatuses.includes(s)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedStatuses([...selectedStatuses, s]);
                              else setSelectedStatuses(selectedStatuses.filter(x => x !== s));
                            }}
                            className="w-4 h-4 rounded-md border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer" 
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Status</h4>
                  <div className="space-y-2.5">
                    {["Paid", "Pending", "Refunded"].map(p => (
                      <label key={p} className="flex items-center space-x-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={selectedPayments.includes(p)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPayments([...selectedPayments, p]);
                            else setSelectedPayments(selectedPayments.filter(x => x !== p));
                          }}
                          className="w-4 h-4 rounded-md border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer" 
                        />
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
              className={`flex items-center px-4 py-2 border rounded-xl text-sm font-bold whitespace-nowrap shadow-sm transition-colors ${activeDropdown === 'date' ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Calendar className={`w-4 h-4 mr-2 ${activeDropdown === 'date' ? 'text-teal-600' : 'text-slate-400'}`} />
              Date Range
            </button>
            {activeDropdown === 'date' && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] border border-slate-100 p-2 z-30 animate-in fade-in slide-in-from-top-2">
                {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Custom Range"].map(range => (
                  <button key={range} onClick={() => setActiveDropdown(null)} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors">
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'more' ? null : 'more')}
              className={`flex items-center px-4 py-2 border rounded-xl text-sm font-bold whitespace-nowrap shadow-sm transition-colors ${activeDropdown === 'more' || selectedDeliveryStatuses.length > 0 || selectedAmountRange ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <SlidersHorizontal className={`w-4 h-4 mr-2 ${activeDropdown === 'more' || selectedDeliveryStatuses.length > 0 || selectedAmountRange ? 'text-teal-600' : 'text-slate-400'}`} />
              More Filters
              {(selectedDeliveryStatuses.length > 0 || selectedAmountRange) && (
                <span className="ml-2 w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">
                  {selectedDeliveryStatuses.length + (selectedAmountRange ? 1 : 0)}
                </span>
              )}
            </button>
            {activeDropdown === 'more' && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] border border-slate-100 p-5 z-30 animate-in fade-in slide-in-from-top-2">
                <div className="mb-5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Delivery Status</h4>
                  <div className="space-y-2.5">
                    {["On the way", "Delivered", "Pending"].map(s => (
                      <label key={s} className="flex items-center space-x-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={selectedDeliveryStatuses.includes(s)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedDeliveryStatuses([...selectedDeliveryStatuses, s]);
                              else setSelectedDeliveryStatuses(selectedDeliveryStatuses.filter(x => x !== s));
                            }}
                            className="w-4 h-4 rounded-md border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer" 
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Amount Range</h4>
                  <div className="space-y-2.5">
                    {["All", "Under ₹100", "₹100 - ₹500", "Over ₹500"].map(range => (
                      <label key={range} className="flex items-center space-x-3 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="amountRange"
                          checked={selectedAmountRange === (range === "All" ? null : range)}
                          onChange={() => {
                            if (range === "All") setSelectedAmountRange(null);
                            else setSelectedAmountRange(range);
                          }}
                          className="w-4 h-4 rounded-full border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer" 
                        />
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{range}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {(selectedDeliveryStatuses.length > 0 || selectedAmountRange) && (
                  <button 
                    onClick={() => {
                      setSelectedDeliveryStatuses([]);
                      setSelectedAmountRange(null);
                    }}
                    className="mt-5 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                  >
                    Clear More Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Content (Desktop) */}
      <div className="hidden lg:block overflow-x-auto w-full hide-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100 tracking-wider">
              <th className="py-4 pl-6 pr-3">Order ID</th>
              <th className="py-4 px-3">Customer</th>
              <th className="py-4 px-3">Items</th>
              <th className="py-4 px-3">Status</th>
              <th className="py-4 px-3">Payment</th>
              <th className="py-4 px-3">Delivery</th>
              <th className="py-4 px-3 text-right">Amount</th>
              <th className="py-4 px-3">Date</th>
              <th className="py-4 px-3 text-right pr-6">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan="11" className="py-8 text-center text-slate-500 font-medium">
                  Loading orders...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="11" className="py-8 text-center text-slate-500 font-medium">
                  No orders found matching "{searchQuery}"
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => {
                    setSelectedOrder(order);
                    setModalMode("direct_detail");
                    setIsModalOpen(true);
                  }}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                <td className="py-4 pl-6 pr-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">{order.id}</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">{order.itemCount}</span>
                  </div>
                </td>
                <td className="py-4 px-3">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${order.customer.seed}&backgroundColor=f8fafc`} 
                      alt={order.customer.name} 
                      className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{order.customer.name}</span>
                      <span className="text-[10px] font-medium text-slate-500 mt-0.5">{order.customer.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                       <span className="text-[8px] font-bold text-slate-300">IMG</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{order.product.name}</span>
                      {order.product.more && <span className="text-[10px] font-bold text-teal-600 mt-0.5">{order.product.more}</span>}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-3">
                  <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-${getStatusColor(order.status)}-50 text-${getStatusColor(order.status)}-700 border border-${getStatusColor(order.status)}-100/50`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-4 px-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${order.payment.isPaid ? 'bg-green-50 text-green-600' : order.payment.status === 'Refunded' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                      {getPaymentIcon(order.payment.method)}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${order.payment.isPaid ? 'text-green-600' : order.payment.status === 'Refunded' ? 'text-orange-600' : 'text-purple-600'}`}>{order.payment.status}</span>
                      <span className="text-[10px] font-medium text-slate-400 mt-0.5">{order.payment.method}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border border-${order.delivery.iconColor}-200 bg-${order.delivery.iconColor}-50 text-${order.delivery.iconColor}-600`}>
                      {getDeliveryIcon(order.delivery.status)}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold text-${order.delivery.iconColor}-600`}>{order.delivery.status}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignDriverClick && onAssignDriverClick(order);
                        }}
                        className="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-0.5 truncate max-w-[120px] text-left"
                        title="Click to assign or change rider"
                      >
                        {order.delivery.rider && order.delivery.rider !== 'Unassigned' ? order.delivery.rider : '+ Assign Rider'}
                      </button>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-3 text-right">
                  <span className="text-sm font-black text-slate-800">{order.amount}</span>
                </td>
                <td className="py-4 px-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{order.date}</span>
                    <span className="text-[10px] font-medium text-slate-400 mt-0.5">{order.time}</span>
                  </div>
                </td>
                <td className="py-4 px-3 text-right pr-6" onClick={e => e.stopPropagation()}>
                  {order.status === 'Pending' ? (
                    <button
                      onClick={() => onAcceptAndDispatch && onAcceptAndDispatch(order.raw?._id || order.id)}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20"
                      title="Accept and dispatch order directly to riders"
                    >
                      <Bike className="w-3.5 h-3.5 mr-1" />
                      Dispatch
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setModalMode("direct_detail");
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
                    >
                      View
                    </button>
                  )}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Card Content (Mobile & Tablet) */}
      <div className="lg:hidden flex flex-col p-4 space-y-4">
        {loading ? (
          <div className="py-8 text-center text-slate-500 font-medium">
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-medium">
            No orders found matching "{searchQuery}"
          </div>
        ) : (
          filteredOrders.map((order, idx) => (
            <div 
              key={idx}
              onClick={() => {
                setSelectedOrder(order);
                setModalMode("direct_detail");
                setIsModalOpen(true);
              }}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col space-y-4 cursor-pointer hover:border-teal-300 hover:shadow-md transition-all active:scale-[0.99]"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-800 tracking-tight">{order.id}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{order.itemCount}</span>
                </div>
                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-${getStatusColor(order.status)}-50 text-${getStatusColor(order.status)}-700 border border-${getStatusColor(order.status)}-200/50 shadow-sm`}>
                  {order.status}
                </span>
              </div>
              
              {/* Customer Info */}
              <div className="flex items-center space-x-3">
                <img 
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${order.customer.seed}&backgroundColor=f8fafc`} 
                  alt={order.customer.name} 
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-slate-50"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700">{order.customer.name}</span>
                  <span className="text-xs font-medium text-slate-500">{order.customer.phone}</span>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center space-x-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${order.payment.isPaid ? 'bg-green-50 text-green-600 border border-green-200' : order.payment.status === 'Refunded' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                    {getPaymentIcon(order.payment.method)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payment</span>
                    <span className={`text-[11px] font-black ${order.payment.isPaid ? 'text-green-600' : order.payment.status === 'Refunded' ? 'text-orange-600' : 'text-purple-600'}`}>{order.payment.status}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm border border-${order.delivery.iconColor}-200 bg-${order.delivery.iconColor}-50 text-${order.delivery.iconColor}-600`}>
                    {getDeliveryIcon(order.delivery.status)}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Delivery</span>
                    <span className={`text-[11px] font-black text-${order.delivery.iconColor}-600 truncate`}>{order.delivery.status}</span>
                  </div>
                </div>
              </div>
              
              {/* Card Footer */}
              <div className="flex justify-between items-end pt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Amount</span>
                  <span className="text-lg font-black text-slate-800 leading-none">{order.amount}</span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-slate-700">{order.date}</span>
                  <span className="text-[10px] font-medium text-slate-500 mt-0.5">{order.time}</span>
                </div>
              </div>

              {order.status === 'Pending' && onAcceptAndDispatch && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcceptAndDispatch(order.raw?._id || order.id);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-emerald-600/20"
                >
                  <Bike className="w-3.5 h-3.5" />
                  Accept & Dispatch to All Riders
                </button>
              )}

            </div>
          ))
        )}
      </div>

    </div>
  );
}
