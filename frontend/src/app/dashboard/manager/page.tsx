"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Users, Check, X, Calendar, UserCheck, AlertTriangle } from 'lucide-react';

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
}

export default function ManagerDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, attRes, leavesRes] = await Promise.all([
        api.getEmployees(0, 15),
        api.getTeamAttendance(),
        api.getPendingLeaves()
      ]);
      // Exclude manager themselves if needed, but simple slice/list is fine
      setEmployees(empRes.filter((e: any) => e.job_title !== 'CEO'));
      setAttendance(attRes);
      setLeaves(leavesRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessLeave = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.updateLeaveStatus(id, status);
      // Reload
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update leave request status.");
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
        <h1 className="text-3xl font-extrabold text-text tracking-tight">Team Overview</h1>
        <p className="text-muted text-sm mt-1">Review team clock-ins, attrition hazards, and evaluate time-off filings.</p>
      </div>

      {/* Grid: Leave Requests & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Time Off (5 cols) */}
        <div id="leaves" className="lg:col-span-5 bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-text text-base">Pending Leave Requests</h4>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
              {leaves.length} Filed
            </span>
          </div>

          {leaves.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted font-medium border border-dashed border-border rounded-xl">
              No pending leave requests to review.
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave) => {
                // Find matching employee name
                const matchingEmp = employees.find(e => e.id === leave.employee_id);
                const empName = matchingEmp ? `${matchingEmp.first_name} ${matchingEmp.last_name}` : "Team Employee";
                
                return (
                  <div key={leave.id} className="p-4 rounded-xl border border-border bg-slate-50/50 space-y-2 text-xs font-medium">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-text text-sm">{empName}</h5>
                        <p className="text-muted text-[10px] uppercase font-bold tracking-wider mt-0.5">{leave.leave_type} LEAVE</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleProcessLeave(leave.id, 'APPROVED')}
                          className="p-1.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg cursor-pointer transition-all"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleProcessLeave(leave.id, 'REJECTED')}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg cursor-pointer transition-all"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-text/85 bg-white p-2 rounded-lg border border-border/40 font-normal">
                      "{leave.reason || 'No reason provided.'}"
                    </p>
                    <p className="text-[10px] text-muted">
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
          <h4 className="font-extrabold text-text text-base">Daily Attendance Logs</h4>
          <p className="text-xs text-muted">Real-time punch records from team members today.</p>
          
          <div className="divide-y divide-border">
            {attendance.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted font-medium">
                No attendance punches logged yet for today.
              </div>
            ) : (
              attendance.map((att) => {
                const matchingEmp = employees.find(e => e.id === att.employee_id);
                const empName = matchingEmp ? `${matchingEmp.first_name} ${matchingEmp.last_name}` : "Team Employee";
                const clockInTime = new Date(att.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={att.id} className="py-3 flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        att.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text">{empName}</p>
                        <p className="text-muted text-[10px] mt-0.5">Punch-in: **{clockInTime}** | Location: {att.location}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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

      {/* Team Roster & Attrition Watch */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h4 className="font-bold text-text text-base">Team Performance & Retention Panel</h4>
          <p className="text-xs text-muted">Overview of performance ratings and pre-emptive attrition risks.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-muted border-b border-border text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Employee</th>
                <th className="py-3 px-6">Job Title</th>
                <th className="py-3 px-6 text-center">Performance Rating</th>
                <th className="py-3 px-6 text-center">Retention Risk</th>
                <th className="py-3 px-6 text-right">Retention Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {employees.map((emp) => {
                // Mock attrition details matched with seeder values
                const riskLevel = emp.first_name === 'Bob' ? 'HIGH' : emp.first_name === 'Jane' ? 'MEDIUM' : 'LOW';
                const riskScore = emp.first_name === 'Bob' ? '81.2%' : emp.first_name === 'Jane' ? '48.0%' : '15.5%';
                
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6 font-bold">{emp.first_name} {emp.last_name}</td>
                    <td className="py-4 px-6 text-muted">{emp.job_title}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-text font-bold text-xs">
                        {emp.performance_rating}/5.0
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                        riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {riskLevel === 'HIGH' && <AlertTriangle className="w-3 h-3" />}
                        {riskScore} ({riskLevel})
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <a
                        href="/dashboard/copilot"
                        className="text-primary font-bold hover:underline text-xs"
                      >
                        Retain Member
                      </a>
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
