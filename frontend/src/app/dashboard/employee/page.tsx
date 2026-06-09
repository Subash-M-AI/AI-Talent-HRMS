"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { MapPin, Calendar, Clock, Star, Brain, CheckSquare, GraduationCap, ChevronRight, Award, Bell } from 'lucide-react';

interface Attendance {
  id: number;
  date: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  location?: string;
}

interface LeaveRequest {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
}

interface SkillAssessment {
  id: number;
  current_role: string;
  target_role: string;
  missing_skills: string[];
  learning_roadmap: any[];
  courses: any[];
  certifications: any[];
}

interface NotificationItem {
  id: number;
  message: string;
  is_read: boolean;
  notification_type: string;
  created_at: string;
}

export default function EmployeeDashboard() {
  const { email } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [assessment, setAssessment] = useState<SkillAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  // Punch actions
  const [punching, setPunching] = useState(false);
  const [punchedInToday, setPunchedInToday] = useState(false);

  // Leave Form
  const [leaveType, setLeaveType] = useState('PAID');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);

  // Career Gap Form
  const [targetRole, setTargetRole] = useState('Tech Lead');
  const [gapLoading, setGapLoading] = useState(false);

  useEffect(() => {
    loadData();
    // Restore saved target role and skill assessment roadmap on load
    const savedRole = sessionStorage.getItem('employee_target_role');
    if (savedRole) {
      setTargetRole(savedRole);
    }
    const savedAssessment = sessionStorage.getItem('employee_skill_assessment');
    if (savedAssessment) {
      try {
        setAssessment(JSON.parse(savedAssessment));
      } catch (e) {
        console.warn("Failed to parse saved skill assessment", e);
      }
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileRes, attendanceRes, leavesRes, notificationsRes] = await Promise.all([
        api.getEmployeeProfile(),
        api.getMyAttendance(),
        api.getMyLeaves(),
        api.getMyNotifications()
      ]);
      setProfile(profileRes);
      setAttendance(attendanceRes);
      setLeaves(leavesRes);
      setNotifications(notificationsRes);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayPunch = attendanceRes.find((a: any) => a.date === todayStr);
      setPunchedInToday(!!todayPunch && !todayPunch.clock_out);
    } catch (err) {
      console.error("Failed to load employee metrics: ", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async () => {
    setPunching(true);
    try {
      if (punchedInToday) {
        await api.punchOut();
      } else {
        await api.punchIn("Office");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || "Attendance punch failed.");
    } finally {
      setPunching(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return;

    setLeaveLoading(true);
    try {
      await api.requestLeave({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason
      });
      setStartDate('');
      setEndDate('');
      setReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to file leave request.");
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      const updated = await api.markNotificationRead(id);
      setNotifications(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err) {
      console.error("Failed to mark notification as read: ", err);
    }
  };

  const handleAnalyzeSkillGap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole || gapLoading || !profile) return;

    setGapLoading(true);
    try {
      const res = await api.analyzeSkillGap(profile.id, targetRole);
      setAssessment(res);
      sessionStorage.setItem('employee_target_role', targetRole);
      sessionStorage.setItem('employee_skill_assessment', JSON.stringify(res));
    } catch (err: any) {
      alert(err.message || "AI Gap analysis failed.");
    } finally {
      setGapLoading(false);
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
        <h1 className="text-3xl font-extrabold text-text tracking-tight">Employee Hub</h1>
        <p className="text-muted text-sm mt-1">Manage daily clock-ins, file time-off requests, and analyze professional career gaps.</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-border shadow-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
            <Bell className="w-5 h-5 text-primary" /> Employee Notifications
          </div>
          <span className="text-[10px] font-bold text-muted bg-slate-100 px-2 py-1 rounded-full">
            {notifications.filter(item => !item.is_read).length} Unread
          </span>
        </div>

        {notifications.length === 0 ? (
          <p className="text-xs text-muted font-medium">No notifications yet. Leave approval updates will appear here.</p>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs ${
                  item.is_read
                    ? 'border-border bg-slate-50/40 text-muted'
                    : item.notification_type === 'SUCCESS'
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <div>
                  <p className="font-bold text-text">{item.message}</p>
                  <p className="text-[10px] mt-0.5 opacity-75">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                {!item.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkNotificationRead(item.id)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white border border-border text-[10px] font-bold text-text hover:border-primary cursor-pointer transition-all"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roster Profile Info & Daily Punch Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-border shadow-card flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent text-primary border border-green-200 font-extrabold text-lg flex items-center justify-center">
                {profile?.first_name[0]}{profile?.last_name[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-text">{profile?.first_name} {profile?.last_name}</h3>
                <p className="text-xs text-muted font-semibold mt-0.5">{profile?.job_title}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted">
              <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> Hired: {profile?.hire_date}</div>
              <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> Core Work Hours: 9:00 - 18:00</div>
              <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-primary animate-pulse" /> Rating: {profile?.performance_rating}/5.0</div>
            </div>
            
            <div className="pt-2 text-xs">
              <span className="font-bold text-text block mb-1">Your Registered Skills:</span>
              <div className="flex flex-wrap gap-1.5">
                {profile?.current_skills.map((skill: string, idx: number) => (
                  <span key={idx} className="bg-slate-100 px-2.5 py-1 rounded text-text font-semibold">{skill}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Punch Area */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-border flex flex-col justify-between items-center text-center w-full md:w-56 shrink-0">
            <h4 className="font-bold text-text text-sm mb-1">Attendance Tracker</h4>
            <p className="text-xs text-muted">Today: **{new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}**</p>
            
            <button
              onClick={handlePunch}
              disabled={punching}
              className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-soft cursor-pointer transition-all mt-4 flex items-center justify-center gap-2 ${
                punchedInToday
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-primary hover:bg-primary-hover text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              {punching ? "Processing..." : punchedInToday ? "Clock Out Today" : "Clock In Today"}
            </button>
            <p className="text-[10px] text-muted font-semibold mt-2.5">Auto-checks late marks after 9:30 AM.</p>
          </div>
        </div>

        {/* Apply for Leave Form (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <h4 className="font-extrabold text-text text-base">Request Leave</h4>
          <form onSubmit={handleApplyLeave} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-text uppercase tracking-wider mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={e => setLeaveType(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:outline-none text-text font-bold"
              >
                <option value="PAID">PAID VACATION</option>
                <option value="SICK">SICK TIME</option>
                <option value="CASUAL">CASUAL DAY</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-text uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-2 py-2 border border-border rounded-xl text-xs focus:outline-none text-text"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-2 py-2 border border-border rounded-xl text-xs focus:outline-none text-text"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text uppercase tracking-wider mb-1">Reason</label>
              <input
                type="text"
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Family visit / medical consult..."
                className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:outline-none text-text"
              />
            </div>

            <button
              type="submit"
              disabled={leaveLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-bold text-xs shadow-soft cursor-pointer transition-all disabled:opacity-50"
            >
              {leaveLoading ? "Filing request..." : "Apply for Leaves"}
            </button>
          </form>
        </div>

        {/* My Leave Requests Panel */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-text text-base">My Leave Requests</h4>
            <span className="text-[10px] font-bold text-muted bg-slate-100 px-2 py-0.5 rounded-full">
              {leaves.length} Filed
            </span>
          </div>

          {leaves.length === 0 ? (
            <p className="text-xs text-muted font-medium py-4 text-center border border-dashed border-border rounded-xl">
              No leave requests filed yet.
            </p>
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {leaves.map((leave) => (
                <div key={leave.id} className="p-3 rounded-xl border border-border bg-slate-50/50 space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-text uppercase tracking-wide text-[10px]">
                      {leave.leave_type} Leave
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      leave.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      leave.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {leave.status === 'REJECTED' ? 'DECLINED' : leave.status}
                    </span>
                  </div>
                  <p className="text-muted text-[10px] font-normal italic">
                    "{leave.reason || 'No reason provided.'}"
                  </p>
                  <p className="text-[10px] text-muted">
                    {leave.start_date} to {leave.end_date}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Skill Gap Analyzer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Career Form (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
            <Brain className="w-5 h-5 text-primary" /> Career Growth Roadmap
          </div>
          <h4 className="font-extrabold text-text text-base">AI Skill Gap Analyzer</h4>
          <p className="text-xs text-muted">Input a target career role to calculate missing technical metrics, certification objectives, and study schedules using Gemini.</p>
          
          <form onSubmit={handleAnalyzeSkillGap} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-text mb-1">Target Corporate Title</label>
              <input
                type="text"
                required
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Lead Software Architect"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm focus:outline-none text-text font-medium"
              />
            </div>
            
            <button
              type="submit"
              disabled={gapLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold text-sm shadow-soft cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {gapLoading ? "Analyzing gap..." : "Run AI Gap Analysis"} <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Gap Analysis Output Renders (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-border shadow-card space-y-5 flex flex-col justify-between min-h-[300px]">
          {gapLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-2.5 py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted font-bold animate-pulse">Gemini analyzing profile and target role requirements...</p>
            </div>
          ) : !assessment ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-2 text-muted">
              <GraduationCap className="w-12 h-12 text-slate-200" />
              <h5 className="font-bold text-text text-sm">No analysis active</h5>
              <p className="text-xs max-w-xs">Run a gap assessment to see your custom learning milestone roads.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Missing skills list */}
              <div>
                <h5 className="text-sm font-bold text-text mb-2">Identified Skill Deficiencies:</h5>
                <div className="flex flex-wrap gap-1.5">
                  {assessment.missing_skills.map((skill, idx) => (
                    <span key={idx} className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded text-xs font-bold">{skill}</span>
                  ))}
                </div>
              </div>

              {/* Learning Roadmap Steps */}
              <div>
                <h5 className="text-sm font-bold text-text mb-2">Career Onboarding Roadmap:</h5>
                <div className="space-y-3">
                  {assessment.learning_roadmap.map((step: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl flex items-start gap-3 text-xs font-medium">
                      <CheckSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <h6 className="font-bold text-text">{step.phase} ({step.duration})</h6>
                        <p className="text-primary font-bold mt-0.5">Milestone: {step.milestone}</p>
                        <p className="text-muted mt-1">Study: {step.tasks.join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Study Courses & Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-slate-50/30">
                  <h6 className="font-bold text-text text-xs mb-2 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary" /> Recommended Courses</h6>
                  <ul className="space-y-1.5 text-xs text-muted font-medium">
                    {assessment.courses.map((c: any, idx: number) => (
                      <li key={idx} className="bullet">**{c.name}** ({c.platform} | {c.duration})</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl border border-border bg-slate-50/30">
                  <h6 className="font-bold text-text text-xs mb-2 flex items-center gap-1.5"><Award className="w-4 h-4 text-primary" /> Target Certifications</h6>
                  <ul className="space-y-1.5 text-xs text-muted font-medium">
                    {assessment.certifications.map((cert: any, idx: number) => (
                      <li key={idx}>**{cert.name}** ({cert.provider} | {cert.difficulty})</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h4 className="font-bold text-text text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Attendance History
          </h4>
          <p className="text-xs text-muted">Your clock-in and clock-out records for the past 30 days.</p>
        </div>
        {attendance.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted font-medium">
            No attendance records yet. Start by clocking in!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-muted border-b border-border text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Clock In</th>
                  <th className="py-3 px-6">Clock Out</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {attendance.slice(0, 10).map((att) => {
                  const clockInTime = new Date(att.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const clockOutTime = att.clock_out ? new Date(att.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                  return (
                    <tr key={att.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-6 font-bold">{att.date}</td>
                      <td className="py-4 px-6">{clockInTime}</td>
                      <td className="py-4 px-6">{clockOutTime}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {att.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-muted">{att.location || '-'}</td>
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
