"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (mounted && !isInitializing) {
      if (!isAuthenticated && !isLoginPage) {
        router.replace("/login");
      } else if (isAuthenticated && isLoginPage) {
        router.replace("/");
      }
    }
  }, [mounted, isInitializing, isAuthenticated, isLoginPage, router]);

  // Loading state during initial token validation
  if (!mounted || isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 text-cyan-500 animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Login page access
  if (isLoginPage) {
    if (isAuthenticated) {
      return null; // Will redirect to "/"
    }
    return <>{children}</>;
  }

  // Strict route guarding: never render protected UI without verified authentication
  if (!isAuthenticated) {
    return null; // Will redirect to "/login"
  }

  const isFixedPage = Boolean(
    pathname?.startsWith("/messages") || 
    pathname?.startsWith("/support") || 
    pathname?.startsWith("/chat")
  );

  return (
    <div className="flex w-full flex-1 h-screen overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 ${isFixedPage ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
        <Topbar />
        <main className={`flex-1 min-h-0 ${isFixedPage ? 'flex flex-col overflow-hidden p-4 md:px-8 md:py-4' : 'p-6 pt-10 md:p-8 md:pt-12'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
