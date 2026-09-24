"use client";

import { User, Mail, Phone, MapPin, Camera, Shield, LogOut, Edit2, Save } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.photoUrl || "https://api.dicebear.com/7.x/notionists/svg?seed=Admin&backgroundColor=f8fafc");

  const nameParts = (user?.displayName || "Admin User").split(" ");
  const firstName = nameParts[0] || "Admin";
  const lastName = nameParts.slice(1).join(" ") || "User";

  return (
    <div className="max-w-[1000px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">My Profile</h1>
          <p className="text-sm font-medium text-slate-500">Manage your personal information and account security.</p>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`hidden md:flex items-center px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm ${
            isEditing 
              ? 'bg-slate-800 text-white hover:bg-slate-900' 
              : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
        >
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column - Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-slate-50 shadow-sm bg-white object-cover" 
              />
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-white border border-slate-100 shadow-md rounded-full flex items-center justify-center text-slate-600 hover:text-teal-600 hover:border-teal-100 transition-colors cursor-pointer">
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = (e) => setAvatarUrl(e.target.result);
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} 
                />
              </label>
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{user?.displayName || "Admin User"}</h2>
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold mt-2 border border-teal-100/50">
              <Shield className="w-3 h-3 mr-1.5" />
              {user?.role ? user.role.toUpperCase() : "ADMIN"}
            </span>
          </div>

          <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-2">
            <button 
              onClick={logout}
              className="w-full flex items-center px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Log Out
            </button>
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-800">Personal Information</h3>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 text-slate-600 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            >
              {isEditing ? <Save className="w-5 h-5 text-teal-600" /> : <Edit2 className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    key={firstName}
                    defaultValue={firstName} 
                    disabled={!isEditing}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-60 transition-all" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    key={lastName}
                    defaultValue={lastName} 
                    disabled={!isEditing}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-60 transition-all" 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email" 
                  key={user?.email || "email"}
                  defaultValue={user?.email || ""} 
                  disabled={!isEditing}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-60 transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="tel" 
                  defaultValue="+91 98765 43210" 
                  disabled={!isEditing}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-60 transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Location</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  defaultValue="New Delhi, India" 
                  disabled={!isEditing}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-60 transition-all" 
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
