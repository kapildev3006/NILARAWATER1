import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, FileText, CheckCircle, XCircle, Search, Filter, Truck, Send, AlertCircle } from "lucide-react";
import BulkOrdersModal from "./BulkOrdersModal";
import { ConfirmOrderModal } from "./ConfirmOrderModal";
import SendQuoteModal from "./SendQuoteModal";
import DispatchBulkModal from "./DispatchBulkModal";
import { fetchWithAuth } from "@/lib/api";

export default function BulkOrdersTable({ orders, loading, onRefresh }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderToConfirm, setOrderToConfirm] = useState(null);
  const [orderToQuote, setOrderToQuote] = useState(null);
  const [orderToDispatch, setOrderToDispatch] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "Delivered":
      case "DELIVERED":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "Confirmed":
      case "CONFIRMED":
      case "CUSTOMER_APPROVED":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "QUOTE_SENT":
        return "bg-indigo-100 text-indigo-800 border border-indigo-200";
      case "DISPATCHED":
        return "bg-teal-100 text-teal-800 border border-teal-200";
      case "Processing":
      case "PROCESSING":
      case "READY_FOR_DISPATCH":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Cancelled":
      case "CANCELLED":
      case "REJECTED":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-orange-100 text-orange-800 border border-orange-200"; // BULK_REQUESTED / Pending
    }
  };

  const updateStatus = async (orderId, newStatus, extraData = {}) => {
    try {
      const response = await fetchWithAuth(`/bulk-orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, ...extraData })
      });
      if (response.success) {
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading bulk orders...</div>;
  }

  if (orders.length === 0) {
    return <div className="p-8 text-center text-slate-500 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">No bulk orders found.</div>;
  }

  // Filter orders by search query and local status filter
  const filteredOrders = orders.filter(order => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        order._id.toLowerCase().includes(q) ||
        (order.user?.displayName || "").toLowerCase().includes(q) ||
        (order.productName || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (selectedStatus) {
      if (order.status !== selectedStatus) return false;
    }

    return true;
  });


  return (
    <>
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col overflow-hidden">
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center gap-4 relative">
        <div ref={dropdownRef} className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by order ID, customer, or product..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            {["Pending", "Confirmed", "Delivered", "Cancelled"].map(s => {
              const isActive = selectedStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => {
                    if (isActive) {
                      setSelectedStatus(null);
                    } else {
                      setSelectedStatus(s);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
        <thead className="bg-transparent border-b border-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
          <tr>
            <th className="py-3 px-4">Order ID</th>
            <th className="py-3 px-4">Customer</th>
            <th className="py-3 px-4">Product & Qty</th>
            <th className="py-3 px-4">Scheduled For</th>
            <th className="py-3 px-4">Total Price</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {filteredOrders.length === 0 ? (
            <tr>
              <td colSpan="7" className="py-12 text-center text-slate-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">No matching orders found.</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
                </div>
              </td>
            </tr>
          ) : (
            filteredOrders.map((order) => (
            <tr 
              key={order._id} 
              onClick={() => setSelectedOrder(order)}
              className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer"
            >
              <td className="py-3 px-4">
                <span className="font-medium text-slate-800">
                  #{order._id.substring(order._id.length - 6).toUpperCase()}
                </span>
                <div className="text-xs text-slate-500 mt-0.5">
                  Placed: {new Date(order.createdAt).toLocaleDateString()}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="font-medium text-slate-800">{order.user?.displayName || "Guest"}</div>
                <div className="text-xs text-slate-500">{order.user?.phone || order.address?.line1 || "No Phone"}</div>
              </td>
              <td className="py-3 px-4">
                <div className="font-medium text-slate-800">{order.productName}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span>Qty: {order.quantity}</span>
                  {(order.quoteDetails?.vehicleRequirement || order.vehicleRequirement) && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {order.quoteDetails?.vehicleRequirement || order.vehicleRequirement}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="font-medium text-slate-800">{order.deliveryDate}</div>
                <div className="text-xs text-slate-500">{order.timeSlot}</div>
              </td>
              <td className="py-3 px-4 font-medium text-slate-800">
                ₹{order.totalPrice.toFixed(2)}
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.bulkStatus || order.status)}`}>
                  {order.bulkStatus || order.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* Send Quote action */}
                  {(order.bulkStatus === 'BULK_REQUESTED' || order.status === 'Pending' || order.bulkStatus === 'UNDER_REVIEW') && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToQuote(order);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                      title="Send Quotation to Customer"
                    >
                      <Send className="w-3 h-3" />
                      Quote
                    </button>
                  )}

                  {/* Dispatch Vehicle action */}
                  {(order.bulkStatus === 'CUSTOMER_APPROVED' || order.bulkStatus === 'CONFIRMED' || order.bulkStatus === 'READY_FOR_DISPATCH' || (order.status === 'Confirmed' && !order.deliveryPartner)) && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDispatch(order);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                      title="Assign Vehicle & Driver"
                    >
                      <Truck className="w-3 h-3" />
                      Dispatch
                    </button>
                  )}

                  {order.bulkStatus === 'QUOTE_SENT' && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      Awaiting Customer
                    </span>
                  )}

                  {order.bulkStatus === 'DISPATCHED' && (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                      On Route
                    </span>
                  )}

                  {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus(order._id, 'Cancelled');
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Cancel Order"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>

    {selectedOrder && (
      <BulkOrdersModal 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        onUpdateStatus={(status) => {
          updateStatus(selectedOrder._id, status);
          setSelectedOrder(null);
        }}
        onOpenQuote={() => {
          setOrderToQuote(selectedOrder);
          setSelectedOrder(null);
        }}
        onOpenDispatch={() => {
          setOrderToDispatch(selectedOrder);
          setSelectedOrder(null);
        }}
      />
    )}

    <ConfirmOrderModal 
      isOpen={!!orderToConfirm}
      order={orderToConfirm}
      onClose={() => setOrderToConfirm(null)}
      onConfirm={(data) => {
        updateStatus(orderToConfirm._id, 'Confirmed', data);
        setOrderToConfirm(null);
      }}
    />

    <SendQuoteModal 
      isOpen={!!orderToQuote}
      order={orderToQuote}
      onClose={() => setOrderToQuote(null)}
      onSuccess={() => {
        onRefresh();
      }}
    />

    <DispatchBulkModal 
      isOpen={!!orderToDispatch}
      order={orderToDispatch}
      onClose={() => setOrderToDispatch(null)}
      onSuccess={() => {
        onRefresh();
      }}
    />
    </>
  );
}
