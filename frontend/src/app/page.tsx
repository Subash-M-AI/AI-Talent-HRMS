"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { ArrowRight, Brain, CheckCircle, LockKeyhole, Shield, Sparkles, UserPlus, UserRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, role, initialize } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    initialize();

    const createdEmail = localStorage.getItem('signup_success_email');
    if (createdEmail) {
      setEmail(createdEmail);
      setSuccess('Account created successfully. Sign in with your new credentials.');
      localStorage.removeItem('signup_success_email');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && role) {
      redirectToDashboard(role);
    }
  }, [isAuthenticated, role]);

  const redirectToDashboard = (userRole: string) => {
    const normalizedRole = userRole.toLowerCase().replace('_', '');
    if (normalizedRole === 'admin') router.push('/dashboard/admin');
    else if (normalizedRole === 'management') router.push('/dashboard/management');
    else if (normalizedRole === 'seniormanager') router.push('/dashboard/manager');
    else if (normalizedRole === 'hrrecruiter') router.push('/dashboard/recruiter');
    else if (normalizedRole === 'employee') router.push('/dashboard/employee');
    else if (normalizedRole === 'candidate') router.push('/dashboard/candidate');
    else router.push('/dashboard/employee');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const data = await api.login(formData);
      login(data.access_token, data.role, data.email, data.user_id);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-12 bg-background">
      <section className="hidden lg:flex lg:col-span-7 bg-green-50 flex-col justify-between p-12 relative overflow-hidden border-r border-emerald-100">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 rounded-xl bg-primary text-white shadow-soft flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <span className="text-xl font-extrabold text-text tracking-tight">
            Next<span className="text-primary font-medium">HRGN</span>
          </span>
        </div>

        <div className="space-y-6 relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-primary text-sm font-semibold border border-green-200">
            <Sparkles className="w-4 h-4" /> Enterprise AI HRMS
          </div>
          {/* Upside graph image */}
          <div className="w-full max-w-sm h-72 rounded-2xl overflow-hidden flex items-center justify-center bg-transparent">
            <img src="/upside-graph.svg" alt="Upside growth graph" className="w-full h-full object-contain" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="p-4 rounded-2xl glass-panel-green">
              <LockKeyhole className="w-5 h-5 text-primary mb-2" />
              <h4 className="font-bold text-text text-sm">Secure Sign In</h4>
              <p className="text-xs text-muted">Credentials are verified by the backend before access is granted.</p>
            </div>
            <div className="p-4 rounded-2xl glass-panel-green">
              <Shield className="w-5 h-5 text-primary mb-2" />
              <h4 className="font-bold text-text text-sm">Role Routing</h4>
              <p className="text-xs text-muted">Admin, recruiter, employee, and candidate dashboards open automatically.</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted relative z-10">
          (c) 2026 NextHRGN Inc.
        </div>
      </section>

      <section className="lg:col-span-5 flex flex-col justify-center p-8 sm:p-12 md:p-16 bg-white relative">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-text">Sign In</h2>
            <p className="text-muted text-sm">Access your HR workspace securely.</p>
          </div>

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-primary text-sm flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-semibold text-sm transition-all shadow-soft flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Access Dashboard"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between rounded-xl border border-border bg-slate-50/60 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-text">New user?</p>
              <p className="text-xs text-muted">Create an account with the correct role.</p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white border border-border hover:border-primary/50 text-text px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <UserPlus className="w-4 h-4" /> Sign Up
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
