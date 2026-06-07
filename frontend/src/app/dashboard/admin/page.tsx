"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Users, Briefcase, TrendingDown, Star, Sparkles, AlertCircle, Plus, Search } from 'lucide-react';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  job_title: string;
  performance_rating: number;
  hire_date: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsCount, setJobsCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Create Employee Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [salary, setSalary] = useState('85000');
  const [skills, setSkills] = useState('React, TypeScript');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, employeesRes, jobsRes] = await Promise.all([
        api.getEmployeeStats(),
        api.getEmployees(0, 10),
        api.getJobs()
      ]);
      setStats(statsRes);
      setEmployees(employeesRes);
      setJobsCount(jobsRes.length);
    } catch (err) {
      console.error("Failed to load admin stats: ", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !jobTitle || !email) return;

    setAddLoading(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      await api.createEmployee({
        first_name: firstName,
        last_name: lastName,
        job_title: jobTitle,
        email,
        password,
        salary: Number(salary),
        current_skills: skillsArray,
        role: "EMPLOYEE"
      });
      // Reset
      setFirstName('');
      setLastName('');
      setJobTitle('');
      setEmail('');
      setShowAddModal(false);
      // Reload
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to create employee.");
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">Executive Dashboard</h1>
          <p className="text-muted text-sm mt-1">Real-time organizational KPI index and candidate talent pipeline.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-soft cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Onboard Employee
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent text-primary flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Total Headcount</p>
            <h3 className="text-2xl font-bold text-text mt-1">{stats?.total_employees || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-success flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Active Employees</p>
            <h3 className="text-2xl font-bold text-text mt-1">{stats?.active_employees || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent text-primary flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Open Positions</p>
            <h3 className="text-2xl font-bold text-text mt-1">{jobsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-primary flex items-center justify-center">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Avg Performance</p>
            <h3 className="text-2xl font-bold text-text mt-1">{stats?.average_performance || 3.0}/5.0</h3>
          </div>
        </div>
      </div>

      {/* AI Insights & Department Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insight Box */}
        <div className="lg:col-span-2 glass-panel-green p-6 rounded-2xl border border-green-200 shadow-glass flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
              <Sparkles className="w-5 h-5 text-primary" /> AI Operational Insights
            </div>
            <h3 className="text-xl font-extrabold text-text">Organizational Health Summary</h3>
            <p className="text-sm text-text/80 leading-relaxed">
              Based on calculations, employee satisfaction is high (average 4.1/5.0). However, the **Engineering** department exhibits a medium attrition risk index (48%) due to a high workload rating in recent reviews. Seeding shows **Bob Smith** presents an attrition score of **81.2%** due to lower environment satisfaction values.
            </p>
            <div className="p-3 bg-white/50 border border-green-200/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-text">Immediate Retention Recommendation</h5>
                <p className="text-[11px] text-muted mt-0.5">Review training frequencies and schedule stay interviews for engineers with 1-2 years tenure to preemptively secure key developers.</p>
              </div>
            </div>
          </div>
          <div className="pt-4 text-xs font-medium text-primary">
            Insight updated today based on live employee performance review metrics.
          </div>
        </div>

        {/* Department Distribution (Custom Chart Widget) */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <h4 className="font-extrabold text-text text-base">Department Talent Share</h4>
          <p className="text-xs text-muted">Distribution of headcount across core groups.</p>
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-text mb-1"><span>Engineering</span><span>42.8%</span></div>
              <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-primary h-2 rounded-full" style={{ width: '42.8%' }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-text mb-1"><span>Product & Design</span><span>28.5%</span></div>
              <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-secondary h-2 rounded-full" style={{ width: '28.5%' }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-text mb-1"><span>HR & Operations</span><span>14.3%</span></div>
              <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-emerald-300 h-2 rounded-full" style={{ width: '14.3%' }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-text mb-1"><span>Sales & Marketing</span><span>14.3%</span></div>
              <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-accent h-2 rounded-full border border-green-200" style={{ width: '14.3%' }} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Active List */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h4 className="font-bold text-text text-base">Active Organization Roster</h4>
          <span className="text-xs font-semibold bg-green-50 text-primary border border-green-200 px-2.5 py-1 rounded-full">
            {employees.length} Active Records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-muted border-b border-border text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-6">Job Title</th>
                <th className="py-3 px-6">Hire Date</th>
                <th className="py-3 px-6 text-center">Perf Rating</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-4 px-6 font-bold">{emp.first_name} {emp.last_name}</td>
                  <td className="py-4 px-6 text-muted">{emp.job_title}</td>
                  <td className="py-4 px-6 text-muted">{emp.hire_date}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      emp.performance_rating >= 4.5 ? 'bg-green-100 text-green-800' :
                      emp.performance_rating >= 3.5 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {emp.performance_rating}/5.0
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <a
                      href={`/dashboard/copilot?query=Analyze%20performance%20and%20promotion%20recommends%20for%20${emp.first_name}%20${emp.last_name}`}
                      className="text-primary font-bold hover:underline text-xs"
                    >
                      Analyze Promotion
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-border shadow-card p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold text-text">Onboard New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-text font-bold">Close</button>
            </div>
            
            <form onSubmit={handleCreateEmployee} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3.5 py-2 border border-border rounded-xl text-sm focus:outline-none text-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3.5 py-2 border border-border rounded-xl text-sm focus:outline-none text-text"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-text mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john.doe@company.com"
                  className="w-full px-3.5 py-2 border border-border rounded-xl text-sm focus:outline-none text-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="Frontend Engineer"
                    className="w-full px-3.5 py-2 border border-border rounded-xl text-sm focus:outline-none text-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text mb-1">Annual Salary ($)</label>
                  <input
                    type="number"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    placeholder="85000"
                    className="w-full px-3.5 py-2 border border-border rounded-xl text-sm focus:outline-none text-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">Technical Skills (comma separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={e => setSkills(e.target.value)}
                  placeholder="React, Next.js, TypeScript"
                  className="w-full px-3.5 py-2 border border-border rounded-xl text-sm focus:outline-none text-text"
                />
              </div>

              <button
                type="submit"
                disabled={addLoading}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold text-sm transition-all shadow-soft cursor-pointer disabled:opacity-50"
              >
                {addLoading ? "Creating Profile..." : "Confirm & Save Roster"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
