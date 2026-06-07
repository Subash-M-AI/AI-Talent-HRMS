"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { TrendingUp, Briefcase, Award, Percent, ChevronRight, Clock, UserCheck, AlertTriangle } from 'lucide-react';

export default function ManagementDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, attRes, empRes] = await Promise.all([
        api.getEmployeeStats(),
        api.getTeamAttendance(),
        api.getEmployees(0, 50)
      ]);
      setStats(statsRes);
      setAttendance(attRes);
      setEmployees(empRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="text-3xl font-extrabold text-text tracking-tight">Workforce Analytics</h1>
        <p className="text-muted text-sm mt-1">High-level growth rates, business alignment KPIs, and department comparisons.</p>
      </div>

      {/* Corporate KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs text-muted font-semibold uppercase tracking-wider">Labor Expense</span>
            <span className="text-xs font-bold text-success bg-green-50 px-2 py-0.5 rounded border border-green-200">+8.4% YoY</span>
          </div>
          <h3 className="text-3xl font-bold text-text">$915,000 <span className="text-xs font-medium text-muted">/ yr</span></h3>
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

      {/* Grid Comparisons */}
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

      {/* Real-time Team Attendance */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h4 className="font-bold text-text text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Real-Time Team Attendance
          </h4>
          <p className="text-xs text-muted">Today's employee clock-in records across all departments.</p>
        </div>
        {attendance.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted font-medium">
            No attendance punches logged yet for today.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-muted border-b border-border text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-6">Clock In</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {attendance.map((att) => {
                  const matchingEmp = employees.find(e => e.id === att.employee_id);
                  const empName = matchingEmp ? `${matchingEmp.first_name} ${matchingEmp.last_name}` : "Team Employee";
                  const clockInTime = new Date(att.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={att.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-6 font-bold">{empName}</td>
                      <td className="py-4 px-6">{clockInTime}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}>
                          <UserCheck className="w-3 h-3" />
                          {att.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-muted">{att.location || 'Office'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
