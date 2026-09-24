"use client";

import { Settings, Shield, Bell, Save, Store, X, Image as ImageIcon, Upload, CheckCircle, AlertCircle, Headphones, Truck, Phone, Mail, AlertTriangle, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import TwoFactorModal from "@/components/settings/TwoFactorModal";

const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "fees", label: "Store Fees", icon: Store },
  { id: "support", label: "Customer Support", icon: Headphones },
  { id: "delivery_support", label: "Delivery Support", icon: Truck },
  { id: "banners", label: "Home Banners", icon: ImageIcon },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [selectedBannerTab, setSelectedBannerTab] = useState("Water");
  const [selectedCarouselTab, setSelectedCarouselTab] = useState("Water");
  const [logoPreview, setLogoPreview] = useState("https://api.dicebear.com/7.x/shapes/svg?seed=Nilara");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFactorMode, setTwoFactorMode] = useState('enable');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [storeSettings, setStoreSettings] = useState({
    handlingCharge: 2,
    deliveryFee: 25,
    freeDeliveryMinAmount: 500,
    referralBonusAmount: 100,
    contactSupport: {
      phone: 'Available 9 AM to 8 PM',
      email: 'support@nilara.com',
      chatResponseTime: 'Usually replies within 5 minutes'
    },
    faqs: [],
    deliverySupport: {
      bannerTitle: 'Partner Support Desk',
      bannerSubtitle: '24x7 Dedicated assistance for delivery issues, payouts, app bugs, and emergency rider safety.',
      statusText: 'Support Live',
      isLive: true,
      helplineNumber: '1800-102-9999',
      helplineTiming: 'Toll Free 24x7',
      supportEmail: 'partner-support@nilara.com',
      emergencyNumber: '1800-102-9999',
      emergencyDescription: 'Immediate on-road safety assistance',
      faqs: []
    },
    homeBanners: [],
    carouselBanners: []
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/settings`);
        const data = await res.json();
        if (data.success && data.data) {
          setStoreSettings(data.data);
        }
      } catch (err) {
        console.error("Error fetching settings", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (activeTab === 'fees' || activeTab === 'general' || activeTab === 'support' || activeTab === 'delivery_support' || activeTab === 'banners') {
      setIsLoadingSettings(true);
      try {
        const res = await fetch(`${API_BASE}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(storeSettings)
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMessage('Settings updated successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      } catch (err) {
        console.error("Error saving settings", err);
        setErrorMessage('Failed to save settings');
        setTimeout(() => setErrorMessage(''), 3000);
      } finally {
        setIsLoadingSettings(false);
      }
    } else {
      setSuccessMessage('Settings saved!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleBannerUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('images', file);
    
    try {
      const res = await fetch(`${API_BASE}/uploads/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_auth_token')}`
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const newBanners = [...(storeSettings.homeBanners || [])];
        newBanners[index].img = data.data[0];
        setStoreSettings({ ...storeSettings, homeBanners: newBanners });
        setSuccessMessage('Banner uploaded locally! Remember to save settings.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        console.error('Upload error:', data);
        setErrorMessage(`Upload failed: ${data.error?.message || data.message || 'Unknown error'}`);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(`Upload failed: ${err.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleCarouselBannerUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('images', file);
    
    try {
      const res = await fetch(`${API_BASE}/uploads/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_auth_token')}`
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const newBanners = [...(storeSettings.carouselBanners || [])];
        newBanners[index].img = data.data[0];
        setStoreSettings({ ...storeSettings, carouselBanners: newBanners });
        setSuccessMessage('Carousel banner uploaded locally! Remember to save settings.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (e) {
      console.error('Upload error', e);
      setErrorMessage('Failed to upload carousel banner');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleCategoryTabUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('images', file);
    
    try {
      const res = await fetch(`${API_BASE}/upload/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_auth_token')}`
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const newTabs = [...(storeSettings.categoryTabs || [])];
        newTabs[index].img = data.data[0];
        setStoreSettings({ ...storeSettings, categoryTabs: newTabs });
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-10">
      
      {/* Toast Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center shadow-sm">
          <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
          <span className="font-semibold text-sm">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3 text-red-500" />
          <span className="font-semibold text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">Settings</h1>
          <p className="text-sm font-medium text-slate-500">Manage your application preferences and system configurations.</p>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={isLoadingSettings}
          className="flex items-center px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoadingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Sidebar */}
        <div className="md:col-span-1 flex gap-2 md:block md:space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex justify-center md:justify-start items-center px-2 py-2.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl text-[11px] sm:text-xs md:text-sm font-bold transition-colors md:w-full ${
                  isActive 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.02)]'
                }`}
              >
                <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-3 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 sm:p-8 min-h-[500px]">
          
          {activeTab === "general" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">General Preferences</h3>
                <p className="text-xs font-medium text-slate-500 mb-6">Update your basic application settings.</p>
                
                <div className="space-y-6 max-w-lg">
                  {/* Logo Uploader */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Platform Logo</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-slate-300">N</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <label className="px-4 py-2 bg-teal-50 text-teal-600 rounded-lg text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer shadow-sm border border-teal-100/50">
                            Upload Photo
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                          </label>
                          <button 
                            onClick={() => setLogoPreview(null)}
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 mt-2">Recommended size: 256x256px. Max file size: 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Platform Name</label>
                    <input 
                      type="text" 
                      defaultValue="Nilara Delivery" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Support Email</label>
                    <input 
                      type="email" 
                      defaultValue="support@nilara.com" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Timezone</label>
                    <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer">
                      <option>(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi</option>
                      <option>(GMT+00:00) London</option>
                      <option>(GMT-05:00) Eastern Time (US & Canada)</option>
                    </select>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Time Slots</label>
                    <p className="text-xs text-slate-500 mb-3">Define the time slots available for customers to choose from.</p>
                    <div className="space-y-2">
                      {(storeSettings.deliveryTimeSlots || []).map((slot, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={slot}
                            onChange={(e) => {
                              const newSlots = [...(storeSettings.deliveryTimeSlots || [])];
                              newSlots[index] = e.target.value;
                              setStoreSettings({ ...storeSettings, deliveryTimeSlots: newSlots });
                            }}
                            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const newSlots = (storeSettings.deliveryTimeSlots || []).filter((_, i) => i !== index);
                              setStoreSettings({ ...storeSettings, deliveryTimeSlots: newSlots });
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const newSlots = [...(storeSettings.deliveryTimeSlots || []), "New Time Slot"];
                        setStoreSettings({ ...storeSettings, deliveryTimeSlots: newSlots });
                      }}
                      className="mt-3 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors inline-block"
                    >
                      + Add Time Slot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Store Fees & Thresholds</h3>
                <p className="text-xs font-medium text-slate-500 mb-6">Manage global cart charges like delivery fees and handling.</p>
                
                <div className="space-y-6 max-w-lg">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Handling Charge (₹)</label>
                    <input 
                      type="number" 
                      value={storeSettings.handlingCharge}
                      onChange={(e) => setStoreSettings({...storeSettings, handlingCharge: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Standard Delivery Fee (₹)</label>
                    <input 
                      type="number" 
                      value={storeSettings.deliveryFee}
                      onChange={(e) => setStoreSettings({...storeSettings, deliveryFee: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Free Delivery Minimum Amount (₹)</label>
                    <input 
                      type="number" 
                      value={storeSettings.freeDeliveryMinAmount || 500}
                      onChange={(e) => setStoreSettings({...storeSettings, freeDeliveryMinAmount: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                    <p className="text-[10px] font-medium text-slate-400 mt-2">If item total exceeds this amount, delivery fee will be FREE.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Design Min Order Quantity</label>
                    <input 
                      type="number" 
                      value={storeSettings.customDesignMinOrder || 100}
                      onChange={(e) => setStoreSettings({...storeSettings, customDesignMinOrder: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Design Surcharge (₹ per bottle)</label>
                    <input 
                      type="number" 
                      value={storeSettings.customDesignSurcharge || 10}
                      onChange={(e) => setStoreSettings({...storeSettings, customDesignSurcharge: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Referral Bonus Amount (₹)</label>
                    <input 
                      type="number" 
                      value={storeSettings.referralBonusAmount || 100}
                      onChange={(e) => setStoreSettings({...storeSettings, referralBonusAmount: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                    <p className="text-[10px] font-medium text-slate-400 mt-2">Amount credited to a user's wallet when their referred friend places a first order.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "support" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black text-slate-800">Customer Support & FAQs</h3>
                  <span className="text-xs font-bold px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5" />
                    Customer App Portal
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 mb-6">Manage customer app support contact details and frequently asked questions.</p>
                
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Support Email</label>
                      <input 
                        type="email" 
                        value={storeSettings.contactSupport?.email || ''}
                        onChange={(e) => setStoreSettings({...storeSettings, contactSupport: {...storeSettings.contactSupport, email: e.target.value}})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chat Response Time Message</label>
                    <input 
                      type="text" 
                      value={storeSettings.contactSupport?.chatResponseTime || ''}
                      onChange={(e) => setStoreSettings({...storeSettings, contactSupport: {...storeSettings.contactSupport, chatResponseTime: e.target.value}})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Customer Frequently Asked Questions ({(storeSettings.faqs || []).length})
                        </label>
                        <p className="text-[11px] text-slate-500">Help questions displayed on the user mobile and web app.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newFaqs = [...(storeSettings.faqs || []), { question: '', answer: '' }];
                          setStoreSettings({ ...storeSettings, faqs: newFaqs });
                        }}
                        className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        + Add Customer FAQ
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(storeSettings.faqs || []).map((faq, index) => (
                        <div key={index} className="flex gap-2 items-start border border-slate-200 p-4 rounded-xl bg-slate-50 hover:bg-white hover:border-teal-200 transition-all">
                          <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-3">
                            <input 
                              type="text" 
                              placeholder="Question (e.g. How do I pause my daily deliveries?)"
                              value={faq.question}
                              onChange={(e) => {
                                const newFaqs = [...(storeSettings.faqs || [])];
                                newFaqs[index].question = e.target.value;
                                setStoreSettings({ ...storeSettings, faqs: newFaqs });
                              }}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                            />
                            <textarea 
                              placeholder="Answer..."
                              value={faq.answer}
                              onChange={(e) => {
                                const newFaqs = [...(storeSettings.faqs || [])];
                                newFaqs[index].answer = e.target.value;
                                setStoreSettings({ ...storeSettings, faqs: newFaqs });
                              }}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all h-20 resize-none" 
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              const newFaqs = (storeSettings.faqs || []).filter((_, i) => i !== index);
                              setStoreSettings({ ...storeSettings, faqs: newFaqs });
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                            title="Delete FAQ"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}

                      {(!storeSettings.faqs || storeSettings.faqs.length === 0) && (
                        <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                          <p className="text-xs">No customer FAQs added yet. Click "+ Add Customer FAQ" above.</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-slate-200 flex justify-end">
                      <button 
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={isLoadingSettings}
                        className="flex items-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isLoadingSettings ? 'Saving...' : 'Save Customer Support'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "delivery_support" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black text-slate-800">Delivery Support & FAQs</h3>
                  <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    Delivery Partner Portal
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 mb-6">Manage delivery partner contact channels, helpline numbers, SOS emergency hotline, and rider FAQs.</p>
                
                <div className="space-y-6 max-w-3xl">
                  {/* Card 1: Partner Support Desk Banner */}
                  <div className="p-5 border border-slate-200 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
                          <Headphones className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Hero Card Header (In-App)</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full transition-all border border-white/10">
                        <input 
                          type="checkbox"
                          checked={storeSettings.deliverySupport?.isLive ?? true}
                          onChange={(e) => setStoreSettings({
                            ...storeSettings,
                            deliverySupport: {
                              ...(storeSettings.deliverySupport || {}),
                              isLive: e.target.checked
                            }
                          })}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-emerald-300">
                          {storeSettings.deliverySupport?.isLive ? 'Desk Online' : 'Desk Offline'}
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Support Desk Title</label>
                        <input 
                          type="text" 
                          value={storeSettings.deliverySupport?.bannerTitle || ''}
                          onChange={(e) => setStoreSettings({
                            ...storeSettings,
                            deliverySupport: {
                              ...(storeSettings.deliverySupport || {}),
                              bannerTitle: e.target.value
                            }
                          })}
                          placeholder="e.g. Partner Support Desk"
                          className="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Live Status Badge Text</label>
                        <input 
                          type="text" 
                          value={storeSettings.deliverySupport?.statusText || ''}
                          onChange={(e) => setStoreSettings({
                            ...storeSettings,
                            deliverySupport: {
                              ...(storeSettings.deliverySupport || {}),
                              statusText: e.target.value
                            }
                          })}
                          placeholder="e.g. Support Live"
                          className="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Support Desk Subtitle</label>
                      <textarea 
                        value={storeSettings.deliverySupport?.bannerSubtitle || ''}
                        onChange={(e) => setStoreSettings({
                          ...storeSettings,
                          deliverySupport: {
                            ...(storeSettings.deliverySupport || {}),
                            bannerSubtitle: e.target.value
                          }
                        })}
                        placeholder="e.g. 24x7 Dedicated assistance for delivery issues, payouts, app bugs..."
                        rows={2}
                        className="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Card 2: Contact Channels */}
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-teal-600" />
                      Partner Support Channels & Contacts
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Partner Helpline Number</label>
                        <input 
                          type="text" 
                          value={storeSettings.deliverySupport?.helplineNumber || ''}
                          onChange={(e) => setStoreSettings({
                            ...storeSettings,
                            deliverySupport: {
                              ...(storeSettings.deliverySupport || {}),
                              helplineNumber: e.target.value
                            }
                          })}
                          placeholder="1800-102-9999"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Helpline Availability Timing</label>
                        <input 
                          type="text" 
                          value={storeSettings.deliverySupport?.helplineTiming || ''}
                          onChange={(e) => setStoreSettings({
                            ...storeSettings,
                            deliverySupport: {
                              ...(storeSettings.deliverySupport || {}),
                              helplineTiming: e.target.value
                            }
                          })}
                          placeholder="Toll Free 24x7"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Partner Desk Email</label>
                      <input 
                        type="email" 
                        value={storeSettings.deliverySupport?.supportEmail || ''}
                        onChange={(e) => setStoreSettings({
                          ...storeSettings,
                          deliverySupport: {
                            ...(storeSettings.deliverySupport || {}),
                            supportEmail: e.target.value
                          }
                        })}
                        placeholder="partner-support@nilara.com"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <div className="p-4 rounded-xl bg-red-50/60 border border-red-100 space-y-3">
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Emergency SOS Safety Hotline</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">SOS Phone Number</label>
                            <input 
                              type="text" 
                              value={storeSettings.deliverySupport?.emergencyNumber || ''}
                              onChange={(e) => setStoreSettings({
                                ...storeSettings,
                                deliverySupport: {
                                  ...(storeSettings.deliverySupport || {}),
                                  emergencyNumber: e.target.value
                                }
                              })}
                              placeholder="1800-102-9999"
                              className="w-full px-4 py-2 bg-white border border-red-200 rounded-xl text-sm font-bold text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Emergency Description</label>
                            <input 
                              type="text" 
                              value={storeSettings.deliverySupport?.emergencyDescription || ''}
                              onChange={(e) => setStoreSettings({
                                ...storeSettings,
                                deliverySupport: {
                                  ...(storeSettings.deliverySupport || {}),
                                  emergencyDescription: e.target.value
                                }
                              })}
                              placeholder="Immediate on-road safety assistance"
                              className="w-full px-4 py-2 bg-white border border-red-200 rounded-xl text-sm font-medium text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Partner FAQs */}
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Partner Frequently Asked Questions ({(storeSettings.deliverySupport?.faqs || []).length})
                        </label>
                        <p className="text-[11px] text-slate-500">Add, reorder, or edit help articles displayed in the rider app.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const currentFaqs = storeSettings.deliverySupport?.faqs || [];
                          setStoreSettings({
                            ...storeSettings,
                            deliverySupport: {
                              ...(storeSettings.deliverySupport || {}),
                              faqs: [...currentFaqs, { question: '', answer: '' }]
                            }
                          });
                        }}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        + Add Partner FAQ
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(storeSettings.deliverySupport?.faqs || []).map((faq, index) => (
                        <div key={index} className="flex gap-2 items-start border border-slate-200 p-4 rounded-xl bg-slate-50 hover:bg-white hover:border-amber-200 transition-all">
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-3">
                            <input 
                              type="text" 
                              placeholder="FAQ Question (e.g., When will my daily earnings be credited?)"
                              value={faq.question}
                              onChange={(e) => {
                                const newFaqs = [...(storeSettings.deliverySupport?.faqs || [])];
                                newFaqs[index].question = e.target.value;
                                setStoreSettings({
                                  ...storeSettings,
                                  deliverySupport: {
                                    ...(storeSettings.deliverySupport || {}),
                                    faqs: newFaqs
                                  }
                                });
                              }}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" 
                            />
                            <textarea 
                              placeholder="FAQ Answer..."
                              value={faq.answer}
                              onChange={(e) => {
                                const newFaqs = [...(storeSettings.deliverySupport?.faqs || [])];
                                newFaqs[index].answer = e.target.value;
                                setStoreSettings({
                                  ...storeSettings,
                                  deliverySupport: {
                                    ...(storeSettings.deliverySupport || {}),
                                    faqs: newFaqs
                                  }
                                });
                              }}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all h-20 resize-none" 
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              const newFaqs = (storeSettings.deliverySupport?.faqs || []).filter((_, i) => i !== index);
                              setStoreSettings({
                                ...storeSettings,
                                deliverySupport: {
                                  ...(storeSettings.deliverySupport || {}),
                                  faqs: newFaqs
                                }
                              });
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                            title="Delete FAQ"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}

                      {(!storeSettings.deliverySupport?.faqs || storeSettings.deliverySupport.faqs.length === 0) && (
                        <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                          <p className="text-xs">No partner FAQs added yet. Click "+ Add Partner FAQ" above.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 flex justify-end">
                    <button 
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isLoadingSettings}
                      className="flex items-center px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoadingSettings ? 'Saving...' : 'Save Delivery Support'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Security Settings</h3>
                <p className="text-xs font-medium text-slate-500 mb-6">Manage your password and security preferences.</p>
                
                <div className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter current password" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter new password" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                    <input 
                      type="password" 
                      placeholder="Confirm new password" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" 
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={is2FAEnabled}
                          onChange={(e) => {
                            setTwoFactorMode(e.target.checked ? 'enable' : 'disable');
                            setIs2FAModalOpen(true);
                          }}
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                      </div>
                      <span className="text-sm font-bold text-slate-700">Enable Two-Factor Authentication (2FA)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Notification Preferences</h3>
                <p className="text-xs font-medium text-slate-500 mb-6">Choose what you want to be notified about.</p>
                
                <div className="space-y-4 max-w-lg">
                  {[
                    { id: "n1", label: "New Order Alerts", desc: "Receive alerts for every new order placed." },
                    { id: "n2", label: "Delivery Delays", desc: "Get notified when a driver is delayed." },
                    { id: "n3", label: "System Alerts", desc: "Server downtime or maintenance warnings." },
                    { id: "n4", label: "Weekly Reports", desc: "Receive a summary of sales every Monday." },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="relative mt-1 shrink-0">
                        <input type="checkbox" className="sr-only peer" defaultChecked={item.id !== "n4"} />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{item.label}</h4>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "banners" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Home Banners</h3>
                <p className="text-xs font-medium text-slate-500 mb-6">Manage the circular banners on the top of the user app home screen.</p>
                
                <div className="space-y-6">
                  {/* Category Tab Selector for Banners */}
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {(storeSettings.categoryTabs || []).map((tab) => (
                      <button
                        key={tab.name}
                        onClick={() => setSelectedBannerTab(tab.name)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                          selectedBannerTab === tab.name
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(storeSettings.homeBanners || []).map((banner, index) => {
                      if (banner.tabName !== selectedBannerTab) return null;
                      return (
                      <div key={index} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                        <div className="aspect-square bg-white rounded-lg border border-slate-200 overflow-hidden mb-4 relative group flex items-center justify-center">
                          {banner.img ? (
                            banner.img.startsWith('http') ? (
                              <img src={banner.img} alt="Banner" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center p-4">
                                <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="text-[10px] text-slate-400">Local Asset:<br/>{banner.img.split('/').pop()}</p>
                              </div>
                            )
                          ) : (
                            <ImageIcon className="w-10 h-10 text-slate-300" />
                          )}
                          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                            <Upload className="w-6 h-6 mb-2" />
                            <span className="text-xs font-bold">Upload New</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBannerUpload(index, e)} />
                          </label>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Action Type</label>
                            <select 
                              value={banner.actionType || 'category'} 
                              onChange={(e) => {
                                const newBanners = [...(storeSettings.homeBanners || [])];
                                newBanners[index].actionType = e.target.value;
                                setStoreSettings({ ...storeSettings, homeBanners: newBanners });
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                            >
                              <option value="category">Category Filter</option>
                              <option value="bulk_order">Bulk Orders Screen</option>
                            </select>
                          </div>
                          
                          {banner.actionType !== 'bulk_order' && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search Query / Filter</label>
                              <input 
                                type="text"
                                value={banner.searchQuery || ''}
                                placeholder="e.g. 20l|can"
                                onChange={(e) => {
                                  const newBanners = [...(storeSettings.homeBanners || [])];
                                  newBanners[index].searchQuery = e.target.value;
                                  setStoreSettings({ ...storeSettings, homeBanners: newBanners });
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                              />
                            </div>
                          )}
                          
                          <button 
                            onClick={() => {
                              const newBanners = (storeSettings.homeBanners || []).filter((_, i) => i !== index);
                              setStoreSettings({ ...storeSettings, homeBanners: newBanners });
                            }}
                            className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Remove Banner
                          </button>
                        </div>
                      </div>
                      );
                    })}
                    
                    <button 
                      onClick={() => {
                        const newBanners = [...(storeSettings.homeBanners || []), { img: '', actionType: 'category', searchQuery: '', tabName: selectedBannerTab }];
                        setStoreSettings({ ...storeSettings, homeBanners: newBanners });
                      }}
                      className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all min-h-[300px]"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <span className="text-xl font-bold">+</span>
                      </div>
                      <span className="text-sm font-bold">Add New Banner</span>
                    </button>
                  </div>
                </div>
                
                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-800 mb-1">Carousel Banners</h3>
                  <p className="text-xs font-medium text-slate-500 mb-6">Manage the auto-playing image carousels at the top of the user app.</p>
                  
                  <div className="space-y-6">
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                      {(storeSettings.categoryTabs || []).map((tab) => (
                        <button
                          key={tab.name}
                          onClick={() => setSelectedCarouselTab(tab.name)}
                          className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                            selectedCarouselTab === tab.name
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </div>
  
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(storeSettings.carouselBanners || []).map((banner, index) => {
                        if (banner.tabName !== selectedCarouselTab) return null;
                        return (
                        <div key={index} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                          <div className="aspect-[4/3] bg-white rounded-lg border border-slate-200 overflow-hidden mb-4 relative group flex items-center justify-center">
                            {banner.img ? (
                              banner.img.startsWith('http') ? (
                                <img src={banner.img} alt="Banner" className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center p-4">
                                  <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                  <p className="text-[10px] text-slate-400">Local Asset:<br/>{banner.img.split('/').pop()}</p>
                                </div>
                              )
                            ) : (
                              <ImageIcon className="w-10 h-10 text-slate-300" />
                            )}
                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                              <Upload className="w-6 h-6 mb-2" />
                              <span className="text-xs font-bold">Upload New</span>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleCarouselBannerUpload(index, e)} />
                            </label>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Action Type</label>
                              <select 
                                value={banner.actionType || 'category'} 
                                onChange={(e) => {
                                  const newBanners = [...(storeSettings.carouselBanners || [])];
                                  newBanners[index].actionType = e.target.value;
                                  setStoreSettings({ ...storeSettings, carouselBanners: newBanners });
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                              >
                                <option value="category">Category Filter</option>
                                <option value="bulk_order">Bulk Orders Screen</option>
                              </select>
                            </div>
                            
                            {banner.actionType !== 'bulk_order' && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search Query / Filter</label>
                                <input 
                                  type="text"
                                  value={banner.searchQuery || ''}
                                  placeholder="e.g. 20l|can"
                                  onChange={(e) => {
                                    const newBanners = [...(storeSettings.carouselBanners || [])];
                                    newBanners[index].searchQuery = e.target.value;
                                    setStoreSettings({ ...storeSettings, carouselBanners: newBanners });
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                                />
                              </div>
                            )}
                            
                            <button 
                              onClick={() => {
                                const newBanners = (storeSettings.carouselBanners || []).filter((_, i) => i !== index);
                                setStoreSettings({ ...storeSettings, carouselBanners: newBanners });
                              }}
                              className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Remove Banner
                            </button>
                          </div>
                        </div>
                        );
                      })}
                      
                      <button 
                        onClick={() => {
                          const newBanners = [...(storeSettings.carouselBanners || []), { img: '', actionType: 'category', searchQuery: '', tabName: selectedCarouselTab }];
                          setStoreSettings({ ...storeSettings, carouselBanners: newBanners });
                        }}
                        className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all min-h-[300px]"
                      >
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                          <span className="text-xl font-bold">+</span>
                        </div>
                        <span className="text-sm font-bold">Add New Banner</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-8 border-t border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-1">Category Tabs</h3>
                <p className="text-xs font-medium text-slate-500 mb-6">Manage the main categories shown on the top of the user app home screen.</p>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {(storeSettings.categoryTabs || []).map((tab, index) => (
                      <div key={index} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col items-center">
                        <div className="w-full">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-center">Tab Name</label>
                          <input 
                            type="text"
                            value={tab.name || ''}
                            onChange={(e) => {
                              const newTabs = [...(storeSettings.categoryTabs || [])];
                              newTabs[index].name = e.target.value;
                              setStoreSettings({ ...storeSettings, categoryTabs: newTabs });
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          
        </div>
      </div>
      
      <TwoFactorModal 
        isOpen={is2FAModalOpen} 
        onClose={() => setIs2FAModalOpen(false)} 
        onSuccess={() => setIs2FAEnabled(twoFactorMode === 'enable')} 
        mode={twoFactorMode}
      />
    </div>
  );
}
