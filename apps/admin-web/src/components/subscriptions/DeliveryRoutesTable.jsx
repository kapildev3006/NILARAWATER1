"use client";

import { useState } from "react";
import { Search, MapPin, Clock, Calendar, Bike, CheckCircle2, ChevronRight, Layers, RefreshCw, AlertCircle, Package } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function DeliveryRoutesTable({ 
  routes = [], 
  loading = false, 
  onRefresh, 
  onAssignDriverClick,
  onSelectRoute 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "STARTED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ASSIGNED":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200"; // CREATED
    }
  };

  const handleGenerateBatches = async () => {
    try {
      setGenerating(true);
      const res = await fetchWithAuth("/admin/delivery-routes/generate-batches", {
        method: "POST"
      });
      if (res.success) {
        onRefresh && onRefresh();
      }
    } catch (err) {
      console.error("Failed to generate routes:", err);
    } finally {
      setGenerating(false);
    }
  };

  const filteredRoutes = routes.filter(r => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNumber = (r.routeNumber || "").toLowerCase().includes(q);
      const matchArea = (r.area || "").toLowerCase().includes(q);
      const matchDriver = (r.deliveryPartner?.displayName || r.deliveryPartner?.name || "").toLowerCase().includes(q);
      if (!matchNumber && !matchArea && !matchDriver) return false;
    }
    return true;
  });

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col overflow-hidden">
      
      {/* Header & Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search route #, area, or rider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "CREATED", "ASSIGNED", "STARTED", "COMPLETED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-teal-100 text-teal-800 border border-teal-200"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerateBatches}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
          title="Auto-collect today's scheduled deliveries and cluster into multi-stop routes"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
          {generating ? "Clustering Batches..." : "Generate Today's Routes"}
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-50/50">
            <tr>
              <th className="py-3 px-5">Route # & Date</th>
              <th className="py-3 px-4">Area & Time Slot</th>
              <th className="py-3 px-4">Stops Progress</th>
              <th className="py-3 px-4">Water Jars</th>
              <th className="py-3 px-4">Assigned Partner</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                  Loading delivery routes...
                </td>
              </tr>
            ) : filteredRoutes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <Layers className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No delivery routes found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click &quot;Generate Today&apos;s Routes&quot; to batch pending subscriptions.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRoutes.map((route) => {
                const partnerName = route.deliveryPartner?.displayName || route.deliveryPartner?.name || "Unassigned";
                const dateStr = new Date(route.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                const progressPct = route.totalStops > 0 ? Math.round((route.completedStops / route.totalStops) * 100) : 0;

                return (
                  <tr
                    key={route._id}
                    onClick={() => onSelectRoute && onSelectRoute(route)}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-5">
                      <span className="font-black text-slate-800 text-xs tracking-tight">
                        {route.routeNumber}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {dateStr}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                        {route.area}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {route.timeSlot?.label || `${route.timeSlot?.start} - ${route.timeSlot?.end}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1 max-w-[140px]">
                        <span>{route.completedStops} / {route.totalStops} Stops</span>
                        <span className="text-[10px] text-teal-600 font-extrabold">{progressPct}%</span>
                      </div>
                      <div className="w-full max-w-[140px] h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-blue-600" />
                        {route.totalJarsToDeliver} Jars
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Delivered: {route.totalJarsDelivered || 0} • Empties: {route.totalEmptyJarsCollected || 0}
                      </div>
                    </td>

                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onAssignDriverClick && onAssignDriverClick(route)}
                        className="text-left group"
                        title="Click to assign or reassign route partner"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center border border-teal-100">
                            {partnerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-teal-600 group-hover:underline">
                              {partnerName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {route.deliveryPartner?.phone || (partnerName === "Unassigned" ? "Click to assign" : "")}
                            </p>
                          </div>
                        </div>
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(route.status)}`}>
                        {route.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onAssignDriverClick && onAssignDriverClick(route)}
                        className="px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
                      >
                        {partnerName === "Unassigned" ? "Assign Rider" : "Change"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
