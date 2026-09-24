"use client";

import { X, MapPin, Phone, CheckCircle2, AlertCircle, Clock, Package, User } from "lucide-react";

export default function RouteDetailModal({ isOpen, onClose, route, onAssignDriverClick }) {
  if (!isOpen || !route) return null;

  const deliveries = route.deliveries || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800">Route #{route.routeNumber}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                {route.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {route.area} • {route.timeSlot?.label || "Morning"} • {route.totalStops} Stops ({route.completedStops} Completed)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Assigned Rider Summary */}
        <div className="px-6 py-4 bg-teal-50/60 border-b border-teal-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {(route.deliveryPartner?.displayName || route.deliveryPartner?.name || "U").charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Assigned Delivery Partner</p>
              <p className="text-sm font-black text-slate-900">
                {route.deliveryPartner?.displayName || route.deliveryPartner?.name || "Unassigned"}
              </p>
              {route.deliveryPartner?.phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {route.deliveryPartner.phone}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onAssignDriverClick && onAssignDriverClick(route);
            }}
            className="px-3 py-1.5 bg-white text-teal-700 hover:bg-teal-100 border border-teal-200 text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            {route.deliveryPartner ? "Reassign Rider" : "Assign Rider"}
          </button>
        </div>

        {/* Stops List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
            Route Stops Sequence ({deliveries.length})
          </h3>

          {deliveries.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No stops recorded for this route.</div>
          ) : (
            deliveries.map((del, idx) => {
              const customerName = del.deliveryAddress?.recipientName || del.customer?.displayName || "Subscriber";
              const customerPhone = del.deliveryAddress?.phone || del.customer?.phone || "";
              const addressStr = del.deliveryAddress?.addressLine1 || del.deliveryAddress?.street || "No address line";
              const isDelivered = del.deliveryStatus === 'DELIVERED';

              return (
                <div
                  key={del._id || idx}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    isDelivered ? 'bg-slate-50/70 border-slate-200' : 'bg-white border-slate-200 hover:border-teal-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {del.stopIndex || idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{customerName}</span>
                        {customerPhone && (
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {customerPhone}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {addressStr}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold">
                          <Package className="w-3 h-3" />
                          {del.totalJarsToDeliver || 1} x 20L Water Jar
                        </span>
                        {del.jarsDelivered !== undefined && (
                          <span className="text-emerald-700 text-[11px]">
                            Delivered: {del.jarsDelivered} • Empties: {del.emptyJarsCollected || 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {del.deliveryStatus || 'SCHEDULED'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
