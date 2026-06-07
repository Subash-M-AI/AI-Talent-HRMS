"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Briefcase, FileText, CheckCircle, Plus, Users, Star, Award, ChevronRight } from 'lucide-react';

interface JobPost {
  id: number;
  title: string;
  requirements: string[];
  status: string;
}

interface Application {
  id: number;
  match_percentage: number;
  ranking_score: number;
  hiring_recommendation: string;
  candidate: {
    first_name: string;
    last_name: string;
    skills: string[];
    resume_score: number;
  };
}

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [rankings, setRankings] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingLoading, setRankingLoading] = useState(false);
  
  // Create Job Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobReqs, setJobReqs] = useState('Python, FastAPI, Postgres');
  const [salaryRange, setSalaryRange] = useState('$110,000 - $140,000');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      loadRankings(selectedJobId);
    }
  }, [selectedJobId]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const jobsRes = await api.getJobs();
      setJobs(jobsRes);
      if (jobsRes.length > 0) {
        setSelectedJobId(jobsRes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRankings = async (jobId: number) => {
    try {
      setRankingLoading(true);
      const rankingsRes = await api.getCandidateRankings(jobId);
      setRankings(rankingsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setRankingLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !jobDesc) return;

    setCreateLoading(true);
    try {
      const requirements = jobReqs.split(',').map(r => r.trim()).filter(Boolean);
      await api.createJob({
        title: jobTitle,
        description: jobDesc,
        department_id: 1, // Engineering default
        requirements,
        salary_range: salaryRange
      });
      setJobTitle('');
      setJobDesc('');
      setShowCreateModal(false);
      await loadJobs();
    } catch (err: any) {
      alert(err.message || "Failed to create position opening.");
    } finally {
      setCreateLoading(false);
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
          <h1 className="text-3xl font-extrabold text-text tracking-tight">Recruitment Dashboard</h1>
          <p className="text-muted text-sm mt-1">Review candidate pipeline matching lists and automated screening scores.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-soft cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Position Openings
        </button>
      </div>

      {/* Main Grid split: Jobs list on left, Candidate matching rankings on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Openings Selection (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-border shadow-card space-y-3">
            <h4 className="font-extrabold text-text text-base">Active Openings</h4>
            <p className="text-xs text-muted">Select an active opening to display candidate similarity matching rankings.</p>
            
            <div className="space-y-2.5 pt-2">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all text-xs font-semibold flex items-center justify-between cursor-pointer ${
                    selectedJobId === job.id
                      ? 'border-primary bg-green-50/20 text-text ring-1 ring-primary'
                      : 'border-border hover:border-slate-300 text-muted'
                  }`}
                >
                  <div>
                    <h5 className="font-bold text-text text-sm mb-1">{job.title}</h5>
                    <p className="text-muted text-[10px]">Requirements: {job.requirements.slice(0, 3).join(', ')}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Candidate Matching Rankings (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-border shadow-card space-y-4 min-h-[300px] flex flex-col">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <div>
              <h4 className="font-extrabold text-text text-base">Semantic Match Rankings</h4>
              <p className="text-xs text-muted mt-0.5">Candidates ranked by local sentence embeddings (cosine similarity) + AI composite indicators.</p>
            </div>
            <span className="text-xs font-semibold bg-accent text-primary px-3 py-1 rounded-full border border-green-200">
              {rankings.length} Applicants
            </span>
          </div>

          {rankingLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rankings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-2">
              <Users className="w-12 h-12 text-slate-200" />
              <h5 className="font-bold text-text text-sm">No applications recorded</h5>
              <p className="text-xs text-muted max-w-xs">Sandbox candidates can apply from the Candidate Portal to generate score matrices.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {rankings.map((app, idx) => (
                <div key={app.id} className="p-5 rounded-2xl border border-border hover:border-slate-300 transition-all space-y-4">
                  {/* Top Header info */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-base font-extrabold text-text">{app.candidate.first_name} {app.candidate.last_name}</h4>
                      <p className="text-xs text-muted mt-0.5">Skills: {app.candidate.skills.join(', ')}</p>
                    </div>
                    {/* Score badges */}
                    <div className="flex gap-2">
                      <div className="text-center px-3 py-1 bg-green-50 text-primary border border-green-200 rounded-xl text-xs font-extrabold">
                        <span className="block text-[10px] text-muted font-bold tracking-wide uppercase leading-none mb-0.5">AI Match</span>
                        {app.match_percentage}%
                      </div>
                      <div className="text-center px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold">
                        <span className="block text-[10px] text-muted font-bold tracking-wide uppercase leading-none mb-0.5">Resume</span>
                        {app.candidate.resume_score}/100
                      </div>
                    </div>
                  </div>
                  
                  {/* Recommendation Assessment */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                    <Award className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-text">AI Recommendation</h5>
                      <p className="text-xs text-text/80 leading-relaxed mt-0.5">{app.hiring_recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Job Position Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-border shadow-card p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold text-text">Create Job Opening</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-text font-bold">Close</button>
            </div>
            
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text mb-1">Position Title</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Lead Devops Architect"
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm focus:outline-none text-text"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">Job Description</label>
                <textarea
                  required
                  rows={4}
                  value={jobDesc}
                  onChange={e => setJobDesc(e.target.value)}
                  placeholder="Describe role responsibilities and qualifications..."
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm focus:outline-none text-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text mb-1">Skill Requirements (comma list)</label>
                  <input
                    type="text"
                    value={jobReqs}
                    onChange={e => setJobReqs(e.target.value)}
                    placeholder="Docker, Python, AWS"
                    className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm focus:outline-none text-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text mb-1">Salary Range</label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={e => setSalaryRange(e.target.value)}
                    placeholder="e.g. $120,000 - $140,000"
                    className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm focus:outline-none text-text"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-soft cursor-pointer disabled:opacity-50"
              >
                {createLoading ? "Creating position..." : "Publish Job Opening"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
