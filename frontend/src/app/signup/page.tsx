"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { ArrowLeft, ArrowRight, Brain, Briefcase, CheckCircle, LockKeyhole, Mail, Shield, UserRound, Users } from 'lucide-react';

type SignupRole = 'ADMIN' | 'MANAGER' | 'HR_RECRUITER' | 'EMPLOYEE' | 'CANDIDATE';

interface RoleOption {
  value: SignupRole;
  label: string;
  description: string;
  defaultTitle: string;
  icon: React.ReactNode;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'EMPLOYEE',
    label: 'Employee',
    description: 'Attendance, leave, and career growth workspace.',
    defaultTitle: 'Employee',
    icon: <UserRound className="w-5 h-5" />
  },
  {
    value: 'CANDIDATE',
    label: 'Candidate',
    description: 'Job application, resume, and interview portal.',
    defaultTitle: 'Candidate',
    icon: <Briefcase className="w-5 h-5" />
  },
  {
    value: 'HR_RECRUITER',
    label: 'HR Recruiter',
    description: 'Hiring pipeline and candidate ranking tools.',
    defaultTitle: 'HR Recruiter',
    icon: <Users className="w-5 h-5" />
  },
  {
    value: 'MANAGER',
    label: 'Manager',
    description: 'Team overview, leave approvals, and workforce analytics.',
    defaultTitle: 'Manager',
    icon: <Shield className="w-5 h-5" />
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'System administration and analytics access.',
    defaultTitle: 'Administrator',
    icon: <LockKeyhole className="w-5 h-5" />
  }
];

const PROFILE_ROLES = new Set<SignupRole>(['MANAGER', 'HR_RECRUITER', 'EMPLOYEE']);

export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState<SignupRole>('EMPLOYEE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedRole = ROLE_OPTIONS.find((option) => option.value === role) || ROLE_OPTIONS[0];
  const createsEmployeeProfile = PROFILE_ROLES.has(role);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.register({
        email: trimmedEmail,
        password,
        role,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        job_title: createsEmployeeProfile ? (jobTitle.trim() || selectedRole.defaultTitle) : undefined
      });

      localStorage.setItem('signup_success_email', trimmedEmail);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <section className="w-full max-w-5xl grid lg:grid-cols-12 bg-white border border-border shadow-card rounded-2xl overflow-hidden">
        <aside className="lg:col-span-4 bg-green-50 border-r border-emerald-100 p-8 flex flex-col justify-between gap-10">
          <div className="space-y-8">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-text transition-all">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>

            <div className="space-y-4">
              <div className="p-2.5 rounded-xl bg-primary text-white shadow-soft inline-flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-text tracking-tight">Create Account</h1>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Choose the role first. The sign-in page will detect that saved role and open the right dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-green-200 bg-white/70 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-text">Role-based access</p>
                <p className="text-xs text-muted mt-1">No role is selected during sign-in. The backend returns it after authentication.</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-8 p-8 md:p-10">
          <form onSubmit={handleSignupSubmit} className="space-y-7">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-text tracking-tight">Signup Details</h2>
              <p className="text-sm text-muted">Set credentials and select the facilities this account should access.</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-text uppercase tracking-wider">Signup Role</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((option) => {
                  const selected = role === option.value;

                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setRole(option.value)}
                      className={`text-left p-4 rounded-xl border transition-all flex gap-3 min-h-[112px] ${
                        selected
                          ? 'border-primary bg-green-50 text-text shadow-soft'
                          : 'border-border hover:border-primary/50 hover:bg-slate-50 text-text'
                      }`}
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-primary text-white' : 'bg-slate-100 text-muted'}`}>
                        {option.icon}
                      </span>
                      <span>
                        <span className="block text-sm font-extrabold">{option.label}</span>
                        <span className="block text-xs text-muted mt-1 leading-relaxed">{option.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
                />
              </div>

              {createsEmployeeProfile && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder={selectedRole.defaultTitle}
                    className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-border pt-6">
              <p className="text-xs text-muted">Already registered? <Link href="/" className="text-primary font-bold hover:underline">Sign in</Link></p>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-soft flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
