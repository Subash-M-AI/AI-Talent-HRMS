"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { Brain, User, Calendar, FileText, CheckSquare, Briefcase, Users, LayoutDashboard, LogOut, Menu, X, Bell } from 'lucide-react';

interface SidebarItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, role, email, logout, initialize } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initialize();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, mounted]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Authorizing session...</p>
        </div>
      </div>
    );
  }

  // Define navigation lists based on role
  const getNavItems = (userRole: string | null): SidebarItem[] => {
    if (!userRole) return [];
    const r = userRole.toUpperCase();
    
    switch (r) {
      case 'ADMIN':
        return [
          { name: "Executive Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, path: "/dashboard/admin" },
          { name: "HR Analytics Copilot", icon: <Brain className="w-5 h-5" />, path: "/dashboard/copilot" },
          { name: "Post Job Openings", icon: <Briefcase className="w-5 h-5" />, path: "/dashboard/recruiter" }
        ];
      case 'MANAGER':
      case 'MANAGEMENT':
      case 'SENIOR_MANAGER':
        return [
          { name: "Workforce Analytics", icon: <LayoutDashboard className="w-5 h-5" />, path: "/dashboard/management" },
          { name: "Leaves Approval", icon: <CheckSquare className="w-5 h-5" />, path: "/dashboard/management#leaves" },
          { name: "HR Analytics Copilot", icon: <Brain className="w-5 h-5" />, path: "/dashboard/copilot" }
        ];
      case 'HR_RECRUITER':
        return [
          { name: "Recruitment Panel", icon: <LayoutDashboard className="w-5 h-5" />, path: "/dashboard/recruiter" },
          { name: "HR Analytics Copilot", icon: <Brain className="w-5 h-5" />, path: "/dashboard/copilot" }
        ];
      case 'EMPLOYEE':
        return [
          { name: "Employee Panel", icon: <LayoutDashboard className="w-5 h-5" />, path: "/dashboard/employee" }
        ];
      case 'CANDIDATE':
        return [
          { name: "Application Portal", icon: <LayoutDashboard className="w-5 h-5" />, path: "/dashboard/candidate" }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems(role);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-border sticky top-0 h-screen z-20">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary text-white flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-text tracking-tight">TalentAI <span className="text-[10px] bg-accent text-primary px-1.5 py-0.5 rounded font-bold uppercase">{role?.replace('_', ' ')}</span></span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item, idx) => (
            <a
              key={idx}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                pathname === item.path 
                  ? 'bg-primary text-white shadow-soft' 
                  : 'text-muted hover:text-text hover:bg-green-50/40'
              }`}
            >
              {item.icon}
              {item.name}
            </a>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-text"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h2 className="text-lg font-bold text-text hidden md:block">Workspace Portal</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative p-2 text-muted hover:text-text rounded-full hover:bg-slate-50 cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent text-primary font-bold flex items-center justify-center border border-green-200">
                {email ? email[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-text leading-none">{email}</p>
                <p className="text-[10px] text-muted capitalize leading-none mt-1">{role?.toLowerCase().replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 top-16 bg-black/20 z-40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
            <div className="w-64 bg-white h-full border-r border-border p-6 flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
              <nav className="space-y-1.5">
                {navItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      pathname === item.path 
                        ? 'bg-primary text-white shadow-soft' 
                        : 'text-muted hover:text-text hover:bg-green-50/40'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </a>
                ))}
              </nav>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
