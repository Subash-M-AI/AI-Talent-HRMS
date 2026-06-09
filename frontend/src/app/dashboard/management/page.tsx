"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { 
  Users, Check, X, Calendar, UserCheck, AlertTriangle, 
  Brain, Sparkles, TrendingUp, Award, Clock, ArrowRight, ShieldAlert,
  ThumbsUp, Target, FileText, CheckCircle2, ChevronRight, Briefcase, LayoutDashboard
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip
} from 'recharts';

interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
}

interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  clock_in: string;
  status: string;
  location: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  job_title: string;
  performance_rating: number;
  current_skills?: string[];
}

interface AIAnalysis {
  summary: string;
  strengths: string[];
  improvements: string[];
  goals: string[];
  recommended_rating: number;
}

export default function ManagementDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // AI & Selection States
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiTab, setAiTab] = useState<'summary' | 'strengths' | 'improvements' | 'goals'>('summary');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadData();
    setMounted(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, attRes, empRes, leavesRes] = await Promise.all([
        api.getEmployeeStats(),
        api.getTeamAttendance(),
        api.getEmployees(0, 50),
        api.getPendingLeaves()
      ]);
      setStats(statsRes);
      setAttendance(attRes);
      
      const teamEmployees = empRes.filter((e: any) => e.job_title !== 'CEO');
      setEmployees(teamEmployees);
      setLeaves(leavesRes);
      
      if (teamEmployees.length > 0) {
        const savedEmpId = sessionStorage.getItem('management_selected_emp_id');
        const parsedEmpId = savedEmpId ? Number(savedEmpId) : null;
        const exists = teamEmployees.some((e: any) => e.id === parsedEmpId);
        
        let activeEmpId = teamEmployees[0].id;
        if (exists && parsedEmpId !== null) {
          activeEmpId = parsedEmpId;
        } else {
          sessionStorage.setItem('management_selected_emp_id', String(activeEmpId));
        }
        
        setSelectedEmpId(activeEmpId);
        
        // Restore cached AI performance analysis for active employee
        const cachedAnalysis = sessionStorage.getItem(`management_ai_analysis_${activeEmpId}`);
        if (cachedAnalysis) {
          try {
            setAiAnalysis(JSON.parse(cachedAnalysis));
          } catch (e) {
            console.warn("Failed to parse cached performance analysis", e);
            setAiAnalysis(null);
          }
        } else {
          setAiAnalysis(null);
        }

        // Restore cached AI tab
        const cachedTab = sessionStorage.getItem('management_ai_tab');
        if (cachedTab === 'summary' || cachedTab === 'strengths' || cachedTab === 'improvements' || cachedTab === 'goals') {
          setAiTab(cachedTab);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleProcessLeave = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.updateLeaveStatus(id, status);
      showToast(`Leave request successfully ${status === 'APPROVED' ? 'approved' : 'declined'}.`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update leave request status.", 'error');
    }
  };

  const handleAnalyzePerformance = async (empId: number) => {
    try {
      setAnalyzing(true);
      setAiAnalysis(null);
      const data = await api.analyzePerformance(empId);
      setAiAnalysis(data);
      setAiTab('summary');
      
      // Cache report and tab selection
      sessionStorage.setItem(`management_ai_analysis_${empId}`, JSON.stringify(data));
      sessionStorage.setItem('management_ai_tab', 'summary');
      
      showToast("AI Performance Report generated successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to run AI performance analysis.", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);

  // Recharts Data
  const chartData = employees.map(emp => ({
    name: `${emp.first_name} ${emp.last_name.charAt(0)}.`,
    "Performance Rating": emp.performance_rating,
  }));

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-muted">Loading management dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <ShieldAlert className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">Workforce Analytics</h1>
          <p className="text-muted text-sm mt-1">High-level growth rates, business alignment KPIs, leave request approvals, and GenAI team reviews.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide">
              {employees.length} Team Members
            </span>
          </div>
        </div>
      </div>

      {/* Corporate KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs text-muted font-semibold uppercase tracking-wider">Labor Expense</span>
            <span className="text-xs font-bold text-success bg-green-50 px-2 py-0.5 rounded border border-green-200">+8.4% YoY</span>
          </div>
          <h3 className="text-3xl font-bold text-text">${stats?.labor_expense?.toLocaleString() || "915,000"} <span className="text-xs font-medium text-muted">/ yr</span></h3>
          <p className="text-xs text-muted">Estimated standard payroll commitments.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs text-muted font-semibold uppercase tracking-wider">Hiring Velocity</span>
            <span className="text-xs font-bold text-success bg-green-50 px-2 py-0.5 rounded border border-green-200">Optimal</span>
          </div>
          <h3 className="text-3xl font-bold text-text">18.4 Days</h3>
          <p className="text-xs text-muted">Average duration to close technical posts.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs text-muted font-semibold uppercase tracking-wider">Corporate Attrition</span>
            <span className="text-xs font-bold text-success bg-green-50 px-2 py-0.5 rounded border border-green-200">Stable</span>
          </div>
          <h3 className="text-3xl font-bold text-text">11.4%</h3>
          <p className="text-xs text-muted">Rolling annual employee exit turnover index.</p>
        </div>
      </div>

      {/* Grid Row: Performance Graph & AI Performance Analyzer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Performance Chart (7 cols) */}
        <div className="xl:col-span-7 bg-white p-6 rounded-2xl border border-border shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-text text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Team Performance Analysis
            </h3>
            <p className="text-xs text-muted">Visual breakdown of team performance ratings based on current appraisals.</p>
          </div>
          
          <div className="h-72 w-full pt-4">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                    labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                  />
                  <Bar dataKey="Performance Rating" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-border rounded-xl text-sm text-muted">
                No performance data available.
              </div>
            )}
          </div>
        </div>

        {/* Gemini AI Performance Analyzer (5 cols) */}
        <div className="xl:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between min-h-[350px]">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
                    Gemini Performance Copilot
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-slate-400">GenAI executive-level performance assessment.</p>
                </div>
              </div>
              {aiAnalysis && (
                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> AI Rec: {aiAnalysis.recommended_rating.toFixed(1)}/5
                </div>
              )}
            </div>

            {selectedEmployee ? (
              <div className="space-y-3 pt-2">
                <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-white">{selectedEmployee.first_name} {selectedEmployee.last_name}</h4>
                    <p className="text-xs text-slate-400">{selectedEmployee.job_title}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                      Curr: {selectedEmployee.performance_rating}/5.0
                    </span>
                  </div>
                </div>

                {/* Loader State */}
                {analyzing && (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-semibold text-slate-400">Gemini is evaluating performance history...</p>
                  </div>
                )}

                {/* Analysis Display */}
                {aiAnalysis && !analyzing && (
                  <div className="space-y-3">
                    {/* Tabs */}
                    <div className="grid grid-cols-4 gap-1 bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-400">
                      {(['summary', 'strengths', 'improvements', 'goals'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => {
                            setAiTab(tab);
                            sessionStorage.setItem('management_ai_tab', tab);
                          }}
                          className={`py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                            aiTab === tab ? 'bg-emerald-600 text-white shadow' : 'hover:text-white'
                          }`}
                        >
                          {tab === 'improvements' ? 'Growth' : tab}
                        </button>
                      ))}
                    </div>

                    {/* Tab Contents */}
                    <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/80 text-xs min-h-[140px] max-h-[160px] overflow-y-auto leading-relaxed">
                      {aiTab === 'summary' && (
                        <p className="text-slate-300">{aiAnalysis.summary}</p>
                      )}
                      {aiTab === 'strengths' && (
                        <ul className="space-y-2">
                          {aiAnalysis.strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-slate-300">
                              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {aiTab === 'improvements' && (
                        <ul className="space-y-2">
                          {aiAnalysis.improvements.map((imp, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-slate-300">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {aiTab === 'goals' && (
                        <ul className="space-y-2">
                          {aiAnalysis.goals.map((g, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-slate-300">
                              <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {!aiAnalysis && !analyzing && (
                  <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500 font-medium">
                    Select the button below to generate a real-time Gemini AI performance review.
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500 font-medium">
                No employee profile selected for appraisal.
              </div>
            )}
          </div>

          {selectedEmployee && !analyzing && (
            <button
              onClick={() => handleAnalyzePerformance(selectedEmployee.id)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white py-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              {aiAnalysis ? "Re-Generate AI Report" : "Generate Gemini AI Report"}
            </button>
          )}
        </div>
      </div>

      {/* Grid: Leave Requests & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Time Off (5 cols) */}
        <div id="leaves" className="lg:col-span-5 bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-text text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Time-off Filings
            </h4>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
              {leaves.length} Pending
            </span>
          </div>

          {leaves.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted font-medium border border-dashed border-border rounded-xl">
              No leave requests pending evaluation.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {leaves.map((leave) => {
                const matchingEmp = employees.find(e => e.id === leave.employee_id);
                const empName = matchingEmp ? `${matchingEmp.first_name} ${matchingEmp.last_name}` : "Team Employee";
                
                return (
                  <div key={leave.id} className="p-4 rounded-xl border border-border bg-slate-50/50 space-y-2.5 text-xs font-medium">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-text text-sm">{empName}</h5>
                        <p className="text-muted text-[10px] uppercase font-bold tracking-wider mt-0.5">{leave.leave_type} LEAVE</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleProcessLeave(leave.id, 'APPROVED')}
                          className="p-1.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg cursor-pointer transition-all"
                          title="Approve Request"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleProcessLeave(leave.id, 'REJECTED')}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg cursor-pointer transition-all"
                          title="Decline Request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-text/80 bg-white p-2.5 rounded-lg border border-border/40 font-normal italic">
                      "{leave.reason || 'No reason provided.'}"
                    </p>
                    <p className="text-[10px] text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Dates: **{leave.start_date}** to **{leave.end_date}**
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Attendance Sheet (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-text text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Daily Attendance Sheet
            </h4>
            <span className="text-[10px] text-muted font-semibold">Today's clock-in punches</span>
          </div>
          
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
            {attendance.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted font-medium">
                No attendance punch records logs found for today.
              </div>
            ) : (
              attendance.map((att) => {
                const matchingEmp = employees.find(e => e.id === att.employee_id);
                const empName = matchingEmp ? `${matchingEmp.first_name} ${matchingEmp.last_name}` : "Team Employee";
                const clockInTime = new Date(att.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={att.id} className="py-3 flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        att.status === 'LATE' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                      }`}>
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text">{empName}</p>
                        <p className="text-muted text-[10px] mt-0.5">Punch-in: **{clockInTime}** | Location: {att.location || 'Office'}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        att.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {att.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Grid: Department Metrics & Quarterly Hiring Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Comparison List */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-text text-base">Department Performance Metrics</h4>
            <a href="/dashboard/copilot" className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5">Ask Copilot <ChevronRight className="w-3 h-3" /></a>
          </div>
          <div className="divide-y divide-border">
            <div className="py-3 flex justify-between items-center font-medium">
              <div>
                <p className="text-sm font-bold text-text">Engineering</p>
                <p className="text-[10px] text-muted">7 Employees | Risk Level: Medium (48%)</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-accent border border-green-200 text-primary px-2.5 py-0.5 rounded-full font-bold">4.5 Rating</span>
              </div>
            </div>
            <div className="py-3 flex justify-between items-center font-medium">
              <div>
                <p className="text-sm font-bold text-text">Product & Design</p>
                <p className="text-[10px] text-muted">2 Employees | Risk Level: Low (15%)</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-accent border border-green-200 text-primary px-2.5 py-0.5 rounded-full font-bold">4.7 Rating</span>
              </div>
            </div>
            <div className="py-3 flex justify-between items-center font-medium">
              <div>
                <p className="text-sm font-bold text-text">Sales & Marketing</p>
                <p className="text-[10px] text-muted">1 Employee | Risk Level: High (81%)</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">3.2 Rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hiring pipeline comparison (Custom CSS chart) */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <h4 className="font-extrabold text-text text-base">Quarterly Hiring Pipeline Growth</h4>
          <p className="text-xs text-muted">Recruitment velocities over the fiscal quarters.</p>
          <div className="h-44 flex items-end justify-between pt-6 border-b border-border pb-2 px-4">
            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-8 bg-primary/40 h-16 rounded-t-lg relative group">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-text">16 Hires</span>
              </div>
              <span className="text-[10px] font-bold text-muted">Q1</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-8 bg-primary/60 h-28 rounded-t-lg relative group">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-text">24 Hires</span>
              </div>
              <span className="text-[10px] font-bold text-muted">Q2</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-8 bg-primary/80 h-36 rounded-t-lg relative group">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-text">32 Hires</span>
              </div>
              <span className="text-[10px] font-bold text-muted">Q3</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-8 bg-primary h-40 rounded-t-lg relative group">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-text">38 Hires</span>
              </div>
              <span className="text-[10px] font-bold text-muted">Q4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Roster List (Interactive table) */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-text text-base">Interactive Team Roster</h4>
            <p className="text-xs text-muted">Click on a member row to select them for appraisal review in the Gemini panel.</p>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-3 py-1 rounded-lg">
            Roster Details
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-muted border-b border-border text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Employee</th>
                <th className="py-3 px-6">Job Title</th>
                <th className="py-3 px-6 text-center">Performance Rating</th>
                <th className="py-3 px-6 text-center">Retention Risk</th>
                <th className="py-3 px-6 text-right">Appraisal Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {employees.map((emp) => {
                const isSelected = emp.id === selectedEmpId;
                const riskLevel = emp.first_name === 'Bob' ? 'HIGH' : emp.first_name === 'Jane' ? 'MEDIUM' : 'LOW';
                const riskScore = emp.first_name === 'Bob' ? '81.2%' : emp.first_name === 'Jane' ? '48.0%' : '15.5%';
                
                return (
                  <tr 
                    key={emp.id} 
                    onClick={() => {
                      setSelectedEmpId(emp.id);
                      sessionStorage.setItem('management_selected_emp_id', String(emp.id));
                      
                      // Restore or clear report cache
                      const cachedAnalysis = sessionStorage.getItem(`management_ai_analysis_${emp.id}`);
                      if (cachedAnalysis) {
                        try {
                          setAiAnalysis(JSON.parse(cachedAnalysis));
                        } catch (e) {
                          setAiAnalysis(null);
                        }
                      } else {
                        setAiAnalysis(null);
                      }
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/30 hover:bg-emerald-50/40' : 'hover:bg-slate-50/40'
                    }`}
                  >
                    <td className="py-4 px-6 font-bold flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      <span>{emp.first_name} {emp.last_name}</span>
                    </td>
                    <td className="py-4 px-6 text-muted">{emp.job_title}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-text font-bold text-xs">
                        {emp.performance_rating}/5.0
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                        riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {riskLevel === 'HIGH' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {riskScore} ({riskLevel})
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setSelectedEmpId(emp.id);
                          sessionStorage.setItem('management_selected_emp_id', String(emp.id));
                          handleAnalyzePerformance(emp.id);
                        }}
                        className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-primary border border-border px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <Brain className="w-3.5 h-3.5" /> Analyze
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
