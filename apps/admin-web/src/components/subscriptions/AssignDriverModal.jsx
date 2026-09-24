"use client";

import { useState, useEffect } from "react";
import { X, Search, Bike, Check, User, Phone, ShieldCheck, AlertCircle } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function AssignDriverModal({ isOpen, onClose, subscription, onAssigned }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      loadDrivers();
      setSelectedDriverId(subscription?.driverId || subscription?.deliveryPartner?._id || null);
      setErrorMsg("");
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, subscription]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/admin/delivery-partners");
      if (res.success && res.data) {
        setDrivers(res.data);
      }
    } catch (err) {
      console.error("Failed to load delivery partners:", err);
      setErrorMsg("Failed to load delivery partners.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!subscription) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      const subId = subscription._id || subscription.id;
      const res = await fetchWithAuth(`/subscriptions/${subId}/assign-driver`, {
        method: "PATCH",
        body: JSON.stringify({ deliveryPartnerId: selectedDriverId || null })
      });

      if (res.success && res.data) {
        onAssigned && onAssigned(res.data);
        onClose();
      } else {
        setErrorMsg(res.message || "Failed to update driver assignment");
      }
    } catch (err) {
      console.error("Error updating driver assignment:", err);
      setErrorMsg("Failed to assign driver. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !subscription) return null;

  const filteredDrivers = drivers.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (d.name?.toLowerCase().includes(q) || d.phone?.includes(q));
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Assign Delivery Boy</h3>
              <p className="text-xs font-semibold text-slate-500">
                Assign a dedicated rider for this subscriber's daily deliveries
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subscription Snapshot Banner */}
        <div className="mx-6 mt-5 p-4 bg-teal-50/60 rounded-2xl border border-teal-100/70 flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider">Subscriber</span>
            <h4 className="text-sm font-black text-slate-800 truncate">{subscription.customerName || "Customer"}</h4>
            <p className="text-xs text-slate-600 truncate mt-0.5">
              {subscription.planName} • {subscription.frequency} ({subscription.quantity || 1}x {subscription.productName})
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Slot</span>
            <p className="text-xs font-black text-slate-800">{subscription.deliveryTime || "Standard"}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center text-xs font-bold text-red-700">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Search Input */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search rider by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Riders List */}
        <div className="flex-1 overflow-y-auto max-h-[320px] px-6 py-2 space-y-2.5 custom-scrollbar">
          {/* Option to Unassign */}
          <div
            onClick={() => setSelectedDriverId(null)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              selectedDriverId === null
                ? "bg-slate-100/80 border-slate-300 ring-2 ring-slate-400/20"
                : "bg-white border-slate-100 hover:border-slate-200"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-sm">
                ∅
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Unassigned</p>
                <p className="text-[11px] text-slate-400">No driver assigned to this subscription</p>
              </div>
            </div>
            {selectedDriverId === null && (
              <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-medium">Loading riders...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold">
              No delivery partners found matching your search.
            </div>
          ) : (
            filteredDrivers.map((driver) => {
              const isSelected = selectedDriverId === driver.id;
              const isCurrent = (subscription.driverId === driver.id || subscription.deliveryPartner?._id === driver.id);
              
              return (
                <div
                  key={driver.id}
                  onClick={() => setSelectedDriverId(driver.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? "bg-teal-50/70 border-teal-300 ring-2 ring-teal-500/20" 
                      : "bg-white border-slate-100 hover:border-teal-100 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="relative">
                      {driver.avatar ? (
                        <img src={driver.avatar} alt={driver.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center font-bold text-sm text-teal-700">
                          {driver.name.charAt(0)}
                        </div>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${driver.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-800 truncate">{driver.name}</p>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-100 text-teal-700">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {driver.phone || "No Phone"} • {driver.status || "Active"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-3">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-200" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex items-center px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm shadow-teal-500/20 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                Confirm Driver Assignment
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
