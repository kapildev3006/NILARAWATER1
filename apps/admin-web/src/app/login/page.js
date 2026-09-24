"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Droplets, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const response = await fetch(`${API_BASE}/auth/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to sign in. Please check your credentials.");
      }

      if (!data.data || data.data.role !== "admin") {
        throw new Error("Access denied. Administrator privileges required.");
      }

      // Use the login function from context to set state and redirect
      login(data.data, data.token);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-200/50 via-cyan-100/20 to-transparent z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-200/50 via-purple-100/20 to-transparent z-0 pointer-events-none" />
      
      {/* Abstract Shapes */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-1/3 -right-20 w-96 h-96 bg-teal-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md p-8 md:p-10 bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 z-10 relative group">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30 transform transition-transform group-hover:scale-105 duration-500" style={{ borderRadius: '40% 40% 0 40%', transform: 'rotate(-45deg)'}}>
            <Droplets className="w-8 h-8 text-white relative z-10" style={{ transform: 'rotate(45deg)'}} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Nilara <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Admin</span></h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Sign in to manage your ecosystem</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 bg-rose-50/80 backdrop-blur-sm border border-rose-100 text-rose-600 text-sm font-bold rounded-2xl animate-fade-in flex items-center justify-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end pb-2">
            <a href="#" className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors">Forgot Password?</a>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs font-semibold text-slate-400">
          Secure, authenticated access only.
        </div>
      </div>
    </div>
  );
}
