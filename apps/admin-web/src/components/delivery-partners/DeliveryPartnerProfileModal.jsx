"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft, Star, Phone, Activity, Mail, Truck, ShieldCheck, CreditCard, ExternalLink, User, Clock, RefreshCw, Calendar, CheckCircle2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function DeliveryPartnerProfileModal({ isOpen, onClose, partnerQuery }) {
  const [dutyData, setDutyData] = useState(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (partnerQuery?.id) {
        loadDutyLogs();
      }
    } else {
      document.body.style.overflow = 'unset';
      setDutyData(null);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, partnerQuery?.id]);

  const loadDutyLogs = async () => {
    if (!partnerQuery?.id) return;
    setIsLoadingLogs(true);
    try {
      const res = await fetchWithAuth(`/admin/delivery-partners/${partnerQuery.id}/duty-logs`);
      if (res && res.success) {
        setDutyData(res.data);
      }
    } catch (err) {
      console.error("Failed to load partner duty logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  if (!isOpen || !partnerQuery) return null;

  const item = partnerQuery;
  const details = item.deliveryDetails || {};
  const bank = details.bankDetails || {};
  const prefs = details.preferences || {};

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center">
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Delivery Partner Profile</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-0.5 font-mono">ID: {item.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
          
          {/* Main Info Card */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-2xl p-6 border border-slate-200/80 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-4">
              {item.avatar ? (
                <img 
                  src={item.avatar} 
                  alt={item.name} 
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-3xl shadow-md">
                  {item.name ? item.name.charAt(0).toUpperCase() : 'D'}
                </div>
              )}
              <div>
                <h3 className="text-2xl font-black text-slate-900">{item.name}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                    <Phone className="w-3.5 h-3.5 text-teal-600" /> {item.phone}
                  </span>
                  {item.email && item.email !== 'N/A' && (
                    <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" /> {item.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5">
              <span className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                (dutyData ? dutyData.isOnline : (item.isOnline !== false))
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full mr-2 ${(dutyData ? dutyData.isOnline : (item.isOnline !== false)) ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {(dutyData ? dutyData.isOnline : (item.isOnline !== false))
                  ? 'ONLINE • ON DUTY'
                  : ((dutyData?.offlineUntil || item.offlineUntil)
                    ? `OFFLINE • Until ${new Date(dutyData?.offlineUntil || item.offlineUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'OFFLINE • UNTIL CHANGED')}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Joined: {item.joinDate}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center bg-white shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rating</p>
              <div className="flex items-center text-amber-500 font-black text-xl">
                <Star className="w-4 h-4 mr-1 fill-amber-500" />
                {item.rating || '5.0'}
              </div>
            </div>
            
            <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center bg-white shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deliveries</p>
              <span className="text-xl font-black text-slate-800">{item.totalDeliveries ?? 0}</span>
            </div>

            <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center bg-white shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Wallet Balance</p>
              <span className="text-xl font-black text-teal-600">₹{item.walletBalance ?? 0}</span>
            </div>

            <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center bg-white shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</p>
              <span className="text-xs font-black text-slate-800 truncate">{item.vehicleType || 'Bike'}</span>
            </div>
          </div>

          {/* Personal & Emergency Details */}
          <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600" /> Personal & Emergency Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
                <p className="font-bold text-slate-800 mt-0.5">{item.dob || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Emergency Contact</p>
                <p className="font-bold text-slate-800 mt-0.5">{item.emergencyContact || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                <p className="font-bold text-slate-800 mt-0.5 truncate">{item.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Vehicle & Hub Information */}
          <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-teal-600" /> Vehicle Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Type</p>
                <p className="font-bold text-slate-800 mt-0.5">{item.vehicleType || details.vehicleType || 'Bike'}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Registration No.</p>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-amber-100 border border-amber-300 rounded font-black text-xs text-slate-900 tracking-wider">
                  {item.vehicleNumber || details.vehicleNumber || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Dark Store / Hub</p>
                <p className="font-bold text-slate-800 mt-0.5">{details.assignedHub || details.darkStore || 'Nilara Central Warehouse'}</p>
              </div>
            </div>

            {/* Vehicle Photos */}
            {(details.vehicleFrontImage || details.vehicleBackImage || details.rcImage) && (
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-500 mb-2">Vehicle Photos & Registration (RC):</p>
                <div className="grid grid-cols-3 gap-3">
                  {details.vehicleFrontImage && (
                    <div className="space-y-1">
                      <a href={details.vehicleFrontImage} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 aspect-video bg-slate-100">
                        <img src={details.vehicleFrontImage} alt="Vehicle Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                          View Front <ExternalLink className="w-3 h-3 ml-1" />
                        </div>
                      </a>
                      <p className="text-[10px] text-center text-slate-500 font-semibold">Vehicle Front</p>
                    </div>
                  )}
                  {details.vehicleBackImage && (
                    <div className="space-y-1">
                      <a href={details.vehicleBackImage} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 aspect-video bg-slate-100">
                        <img src={details.vehicleBackImage} alt="Vehicle Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                          View Back <ExternalLink className="w-3 h-3 ml-1" />
                        </div>
                      </a>
                      <p className="text-[10px] text-center text-slate-500 font-semibold">Vehicle Back</p>
                    </div>
                  )}
                  {details.rcImage && (
                    <div className="space-y-1">
                      <a href={details.rcImage} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 aspect-video bg-slate-100">
                        <img src={details.rcImage} alt="RC Document" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                          View RC <ExternalLink className="w-3 h-3 ml-1" />
                        </div>
                      </a>
                      <p className="text-[10px] text-center text-slate-500 font-semibold">RC Certificate</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* KYC Documents */}
          <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> KYC Verification Documents
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Aadhaar Card</span>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {details.aadharNumber || 'N/A'}
                  </span>
                </div>
                {details.aadharImage ? (
                  <a href={details.aadharImage} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 aspect-video bg-slate-100">
                    <img src={details.aadharImage} alt="Aadhaar Document" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                      Open Aadhaar Document <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </a>
                ) : (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No document image uploaded</p>
                )}
              </div>

              <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Driving License</span>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {details.drivingLicenseNumber || 'N/A'}
                  </span>
                </div>
                {details.drivingLicenseImage ? (
                  <a href={details.drivingLicenseImage} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 aspect-video bg-slate-100">
                    <img src={details.drivingLicenseImage} alt="Driving License Document" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                      Open License Document <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  </a>
                ) : (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No document image uploaded</p>
                )}
              </div>
            </div>
          </div>

          {/* Bank & Payout Configuration */}
          <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-teal-600" /> Bank & Payout Configuration
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</p>
                <p className="font-bold text-slate-800 mt-0.5">{bank.bankName || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Account Holder</p>
                <p className="font-bold text-slate-800 mt-0.5">{bank.accountHolderName || item.name}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Account Number</p>
                <p className="font-bold text-slate-800 mt-0.5 font-mono">{bank.accountNumber || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">IFSC Code</p>
                <p className="font-bold text-slate-800 mt-0.5 font-mono">{bank.ifscCode || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">UPI ID</p>
                <p className="font-bold text-slate-800 mt-0.5 font-mono">{bank.upiId || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Account Type</p>
                <p className="font-bold text-slate-800 mt-0.5">{bank.accountType || 'Savings'}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Payout Frequency</p>
                <p className="font-bold text-slate-800 mt-0.5">{bank.payoutFrequency || 'Daily'}</p>
              </div>
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Payout Mode</p>
                <p className="font-bold text-slate-800 mt-0.5">{bank.payoutMode || 'Bank Transfer'}</p>
              </div>
            </div>
          </div>

          {/* Duty & Working Hours Logs */}
          <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" /> Duty & Working Hours Logs
              </h4>
              <button 
                onClick={loadDutyLogs}
                disabled={isLoadingLogs}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} /> Refresh Logs
              </button>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Working Hours Today</p>
                <p className="text-lg font-black text-emerald-900 mt-0.5">
                  {dutyData?.metrics?.onlineHoursFormatted || '0h 0m'}
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-xl">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Breaks Today</p>
                <p className="text-lg font-black text-amber-900 mt-0.5">
                  {dutyData?.metrics?.offlineHoursFormatted || '0h 0m'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Duty Shifts Today</p>
                <p className="text-lg font-black text-slate-800 mt-0.5">
                  {dutyData?.metrics?.totalShiftsToday ?? 0}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Current Schedule</p>
                <p className="text-xs font-black text-slate-800 mt-1 truncate">
                  {dutyData?.offlineOption ? dutyData.offlineOption.replace(/_/g, ' ') : ((dutyData ? dutyData.isOnline : (item.isOnline !== false)) ? 'Active Online' : 'Offline')}
                </p>
              </div>
            </div>

            {/* Logs Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Started At</th>
                      <th className="py-2.5 px-3">Ended At</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Mode / Break Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {dutyData?.logs && dutyData.logs.length > 0 ? (
                      dutyData.logs.map((log) => {
                        const isOnlineLog = log.status === 'ONLINE';
                        const startDate = new Date(log.startedAt);
                        const endDate = log.endedAt ? new Date(log.endedAt) : null;
                        const durationMins = log.durationMinutes || (endDate ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 60000)) : 0);
                        const durationFormatted = durationMins > 0 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : 'In progress';

                        return (
                          <tr key={log._id || log.startedAt} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isOnlineLog ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnlineLog ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                              {startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}, {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                              {endDate ? (
                                `${endDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              ) : (
                                <span className="text-teal-600 font-bold">Active Now</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-800">
                              {durationFormatted}
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">
                              {log.durationOption ? log.durationOption.replace(/_/g, ' ') : (isOnlineLog ? 'Normal Duty' : 'Break')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-medium">
                          {isLoadingLogs ? 'Loading duty session logs...' : 'No duty logs recorded yet for this partner.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* App Preferences */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Navigation: <strong className="text-slate-800">{prefs.navigationApp || 'OpenStreetMap'}</strong>
            </span>
            <span className="text-slate-500 font-medium">
              Language: <strong className="text-slate-800">{prefs.language || 'English'}</strong>
            </span>
            <span className="text-slate-500 font-medium">
              Alert Tone: <strong className="text-slate-800">{prefs.alertTone || 'Default Chime'}</strong>
            </span>
          </div>

        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button onClick={onClose} className="px-8 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
