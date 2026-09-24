"use client";

import { useState, useEffect } from "react";
import { X, Search, Phone, Check, Bike, AlertCircle } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function AssignOrderDriverModal({ isOpen, onClose, order, onAssigned }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(order?.raw?.deliveryPartner?._id || order?.raw?.deliveryPartner || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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

  useEffect(() => {
    if (isOpen) {
      loadDrivers();
      setSelectedDriverId(order?.raw?.deliveryPartner?._id || order?.raw?.deliveryPartner || null);
      setErrorMsg("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, order]);

  const handleSave = async () => {
    if (!order) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      const orderId = order.raw?._id || order.id;
      const res = await fetchWithAuth(`/admin/orders/${orderId}/assign-driver`, {
        method: "POST",
        body: JSON.stringify({ deliveryPartnerId: selectedDriverId || null })
      });

      if (res.success) {
        onAssigned && onAssigned(res.data);
        onClose();
      } else {
        setErrorMsg(res.message || "Failed to update driver assignment");
      }
    } catch (err) {
      console.error("Error updating order driver assignment:", err);
      setErrorMsg("Failed to assign driver. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  const filteredDrivers = drivers.filter(d => {
    const name = (d.name || d.displayName || "").toLowerCase();
    const phone = (d.phone || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-800">Assign Delivery Partner</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{order.id} • {order.product?.name} ({order.itemCount})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rider by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Drivers List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {/* Option: Unassign */}
          <div
            onClick={() => setSelectedDriverId(null)}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              selectedDriverId === null
                ? "bg-slate-100 border-slate-300 font-bold"
                : "bg-white border-slate-100 hover:bg-slate-50"
            }`}
          >
            <div>
              <p className="text-xs font-bold text-slate-700">No Rider Assigned (Auto Search)</p>
              <p className="text-[11px] text-slate-400">Dispatch system will look for nearest online partner</p>
            </div>
            {selectedDriverId === null && (
              <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading delivery partners...</div>
          ) : filteredDrivers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No matching riders found.</div>
          ) : (
            filteredDrivers.map((driver) => {
              const dId = driver._id || driver.id;
              const isSelected = selectedDriverId === dId;
              const isOnline = driver.availability === 'ONLINE' || driver.status === 'Active';

              return (
                <div
                  key={dId}
                  onClick={() => setSelectedDriverId(dId)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-teal-50/80 border-teal-300 ring-2 ring-teal-500/20"
                      : "bg-white border-slate-100 hover:border-teal-100"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center font-bold text-xs text-teal-700">
                      {(driver.name || driver.displayName || "D").charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{driver.name || driver.displayName}</span>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {driver.phone || "No Phone"} • {driver.vehicleType || "Bike"}
                      </span>
                    </div>
                  </div>

                  <div className="pl-3">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-200" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSave}
            className="flex-1 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Bike className="w-4 h-4" />
            {submitting ? "Assigning..." : "Confirm Rider"}
          </button>
        </div>

      </div>
    </div>
  );
}
