"use client";

import { X, Search, ChevronRight, User, ArrowLeft, Star, Phone, Activity, Mail, Truck, ShieldCheck, CreditCard, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import CustomerProfileModal from "@/components/customers/CustomerProfileModal";

export default function DeliveryPartnersListModal({ isOpen, onClose, filterType, selectedItem, setSelectedItem, modalMode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [customerToView, setCustomerToView] = useState(null);

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
    const details = item.deliveryDetails || {};
    const bank = details.bankDetails || {};
    const prefs = details.preferences || {};

    return (
      <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center">
              {modalMode !== "direct_detail" && (
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors mr-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-800">Delivery Partner Profile</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-0.5 font-mono">ID: {item.id}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 shadow-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Partner Identity Card */}
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
                    {item.name.charAt(0).toUpperCase()}
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
                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold ${
                  item.availability === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' :
                  item.availability === 'BUSY' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${item.availability === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  {item.availability || 'ONLINE'}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Joined: {item.joinDate}
                </span>
              </div>
            </div>

            {/* Metrics KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rating</p>
                <div className="flex items-center justify-center text-amber-500 text-xl font-black">
                  <Star className="w-4 h-4 mr-1 fill-amber-500" />
                  {item.rating || '5.0'}
                </div>
              </div>
              <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deliveries</p>
                <p className="text-xl font-black text-slate-800">{item.totalDeliveries ?? 0}</p>
              </div>
              <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Wallet Balance</p>
                <p className="text-xl font-black text-teal-600">₹{item.walletBalance ?? 0}</p>
              </div>
              <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</p>
                <p className="text-xs font-black text-slate-800 truncate">{item.vehicleType || 'Bike'}</p>
              </div>
            </div>

            {/* Personal & Contact Details */}
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

            {/* KYC & Identity Verification */}
            <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" /> KYC Verification Documents
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Aadhaar */}
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

                {/* Driving License */}
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

            {/* Bank & Payout Information */}
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
          
          {/* Modal Footer */}
          <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
              Close
            </button>
          </div>
        </div>
      </div>
      <CustomerProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
        customerQuery={customerToView} 
      />
      </>
    );
  }

  // Render List View
  const listItems = [].filter(item => {
    if (filterType === "online_now" && item.status !== "Online") return false;
    if (filterType === "churned_partners" && item.status !== "Offline") return false;
    if (filterType === "avg_rating" && item.rating < 4.5) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && 
          !item.phone.includes(q)) return false;
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
              placeholder="Search partners..."
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
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5">{item.vehicle}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center justify-end text-amber-500 font-bold text-sm mb-1">
                      <Star className="w-3.5 h-3.5 mr-1 fill-amber-500" />
                      {item.rating}
                    </div>
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
