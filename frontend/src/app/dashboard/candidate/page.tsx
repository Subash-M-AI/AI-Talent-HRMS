"use client";

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Upload, Briefcase, FileText, CheckCircle, Brain, Mic, Volume2, ShieldAlert, Sparkles, Award } from 'lucide-react';

interface Application {
  id: number;
  status: string;
  match_percentage: number;
  job_post_id: number;
  job_post?: {
    id: number;
    title: string;
    description: string;
  };
}

export default function CandidateDashboard() {
  const [candidate, setCandidate] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Voice Interview Panel States
  const [activeInterview, setActiveInterview] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [recording, setRecording] = useState(false);
  const [speechRecognizer, setSpeechRecognizer] = useState<any>(null);
  const [interviewStatusText, setInterviewStatusText] = useState('');
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    loadData();
    setupSpeechRecognition();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [candRes, jobsRes, appsRes] = await Promise.all([
        api.getCandidateProfile().catch(() => null), // might not have resume yet
        api.getJobs(),
        api.getMyApplications()
      ]);
      setCandidate(candRes);
      setJobs(jobsRes);
      setApplications(appsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setupSpeechRecognition = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setTranscript(finalTranscript || interimTranscript);
        };

        recognition.onerror = (e: any) => {
          console.error("Speech recognition error: ", e);
          setRecording(false);
        };

        recognition.onend = () => {
          setRecording(false);
        };

        setSpeechRecognizer(recognition);
      }
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await api.uploadResume(file);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to upload and parse resume.");
    } finally {
      setUploading(false);
    }
  };

  const handleApply = async (jobId: number) => {
    try {
      await api.applyForJob(jobId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Application failed.");
    }
  };

  // --- Voice Recruiter Interactions ---
  const handleStartInterview = async (appId: number) => {
    try {
      setEvalResult(null);
      setInterviewStatusText("Initializing AI Screening Panel...");
      const session = await api.scheduleInterview(appId, 'VOICE');
      setActiveInterview(session);
      
      const history = session.chat_history;
      const initialWelcome = history[0]?.message || "Hello! Welcome to your voice screening.";
      setCurrentQuestion(initialWelcome);
      setInterviewStatusText('');
      
      // Text-To-Speech: Speak welcome and first question
      speakText(initialWelcome);
    } catch (err: any) {
      alert(err.message || "Failed to start interview.");
    }
  };

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Clean markdown tags out of audio speech output
      const cleanText = text.replace(/\*\*/g, '').replace(/###/g, '');
      window.speechSynthesis.cancel(); // stop current speak
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleRecording = () => {
    if (!speechRecognizer) {
      alert("Speech recognition API is not supported in this browser. Please type your responses.");
      return;
    }

    if (recording) {
      speechRecognizer.stop();
      setRecording(false);
    } else {
      setTranscript('');
      speechRecognizer.start();
      setRecording(true);
    }
  };

  const handleSendAnswer = async () => {
    if (!transcript.trim() || !activeInterview) return;

    setRecording(false);
    if (speechRecognizer) speechRecognizer.stop();

    try {
      setInterviewStatusText("Submitting answer and loading next question...");
      const updatedSession = await api.sendInterviewChat(activeInterview.id, transcript);
      
      setActiveInterview(updatedSession);
      setTranscript('');
      
      const history = updatedSession.chat_history;
      const latestRecruiterReply = history[history.length - 1]?.message || '';
      setCurrentQuestion(latestRecruiterReply);
      setInterviewStatusText('');

      // Play Next Question
      speakText(latestRecruiterReply);
    } catch (err: any) {
      alert(err.message || "Failed to submit answer.");
      setInterviewStatusText('');
    }
  };

  const handleEvaluateInterview = async () => {
    if (!activeInterview) return;

    setEvalLoading(true);
    try {
      const evaluated = await api.evaluateInterview(activeInterview.id);
      setEvalResult(evaluated);
      setActiveInterview(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Evaluation failed.");
    } finally {
      setEvalLoading(false);
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
        <h1 className="text-3xl font-extrabold text-text tracking-tight">Application Portal</h1>
        <p className="text-muted text-sm mt-1">Upload resumes, review applications, and execute AI screening interviews.</p>
      </div>

      {/* Resume Upload & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload File Box (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-border shadow-card flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-extrabold text-text text-base">Resume Profile Management</h4>
            <p className="text-xs text-muted">Upload your resume in PDF format to populate candidate parsing indexes.</p>
            
            <div className="pt-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 bg-slate-50/50 hover:bg-green-50/10 rounded-2xl p-6 cursor-pointer transition-all text-center">
                <Upload className="w-8 h-8 text-primary mb-2" />
                <span className="text-xs font-bold text-text">Choose Resume PDF</span>
                <span className="text-[10px] text-muted font-semibold mt-1">Max upload 5MB</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          
          {uploading && (
            <p className="text-[10px] text-primary font-bold animate-pulse mt-4">Analyzing skills, experience structures, and certifications using Gemini...</p>
          )}

          {candidate && (
            <div className="border-t border-border mt-5 pt-4 space-y-2 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-muted">Extracted Name:</span>
                <span className="text-text font-bold">{candidate.first_name} {candidate.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">AI Profile Score:</span>
                <span className="text-primary font-bold">{candidate.resume_score}/100</span>
              </div>
              <div>
                <span className="text-muted block mb-1">Parsed Core Skills:</span>
                <div className="flex flex-wrap gap-1">
                  {candidate.skills.slice(0, 5).map((skill: string, idx: number) => (
                    <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{skill}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Voice Interview Agent Workspace (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-border shadow-card flex flex-col min-h-[350px]">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
            <Brain className="w-5 h-5 text-primary" /> AI Voice Screening Agent
          </div>
          
          {/* Default Screen */}
          {!activeInterview && !evalResult && !evalLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-8 text-muted">
              <Mic className="w-12 h-12 text-slate-200" />
              <h5 className="font-bold text-text text-sm">Voice Recruiter Inactive</h5>
              <p className="text-xs max-w-sm">When your application status changes to 'Interviewing', click 'Start Screening' to begin your automated verbal evaluation.</p>
            </div>
          )}

          {/* Active Voice Interview Screen */}
          {activeInterview && (
            <div className="flex-1 flex flex-col justify-between space-y-6 pt-2">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl glass-panel-green border border-green-200">
                  <p className="text-sm font-bold text-text whitespace-pre-line leading-relaxed">{currentQuestion}</p>
                </div>
                
                {/* Speech recognition text output */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl min-h-[80px]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1 flex items-center gap-1">
                    Your Transcribed Answer {recording && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />}
                  </p>
                  <p className="text-sm text-text/80 font-medium">
                    {transcript || "Speak clearly into your microphone or type your answer..."}
                  </p>
                </div>
              </div>

              {/* Status indicators */}
              {interviewStatusText && (
                <p className="text-[10px] text-primary font-bold animate-pulse">{interviewStatusText}</p>
              )}

              {/* Speech control panels */}
              <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleRecording}
                    className={`p-3.5 rounded-full shadow-soft cursor-pointer transition-all flex items-center justify-center ${
                      recording ? 'bg-red-500 text-white animate-pulse' : 'bg-primary text-white hover:bg-primary-hover'
                    }`}
                    title={recording ? "Stop Recording" : "Record Answer"}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => speakText(currentQuestion)}
                    className="p-3.5 bg-slate-100 hover:bg-slate-200 text-text rounded-full cursor-pointer transition-all flex items-center justify-center"
                    title="Re-read Question Out Loud"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  
                  {/* Visual Waveform bar toggled on record */}
                  {recording && (
                    <div className="flex items-end h-6 ml-2">
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* If questions left, Send. If last question index done, Evaluate */}
                  {currentQuestion.includes("Submit Interview") ? (
                    <button
                      onClick={handleEvaluateInterview}
                      className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-soft cursor-pointer transition-all"
                    >
                      Submit & Evaluate Answers
                    </button>
                  ) : (
                    <button
                      onClick={handleSendAnswer}
                      disabled={!transcript.trim()}
                      className="bg-primary hover:bg-primary-hover disabled:bg-slate-100 disabled:text-slate-400 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-soft cursor-pointer transition-all"
                    >
                      Send Answer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Evaluation Report Screen */}
          {evalLoading && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted font-bold animate-pulse">AI Recruiter reviewing and grading transcript matrices...</p>
            </div>
          )}

          {evalResult && (
            <div className="flex-1 space-y-5 pt-2">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <h4 className="font-extrabold text-text text-base">Verbal Screening Evaluation</h4>
                <span className="text-xs font-extrabold text-primary bg-accent px-3 py-1 rounded-full border border-green-200">
                  Passed Round
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 border border-border bg-slate-50/50 rounded-xl">
                  <span className="block text-[10px] text-muted uppercase font-bold mb-1">Technical</span>
                  <span className="text-base font-bold text-text">{evalResult.technical_score}%</span>
                </div>
                <div className="p-3 border border-border bg-slate-50/50 rounded-xl">
                  <span className="block text-[10px] text-muted uppercase font-bold mb-1">Communication</span>
                  <span className="text-base font-bold text-text">{evalResult.communication_score}%</span>
                </div>
                <div className="p-3 border border-border bg-slate-50/50 rounded-xl">
                  <span className="block text-[10px] text-muted uppercase font-bold mb-1">Confidence</span>
                  <span className="text-base font-bold text-text">{evalResult.confidence_score}%</span>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <span className="block text-[10px] text-primary uppercase font-bold mb-1">Composite</span>
                  <span className="text-base font-bold text-primary">{evalResult.overall_score}%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-slate-50/20 flex gap-3">
                <Award className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-text uppercase tracking-wider mb-1">Interviewer Feedback Synthesis</h5>
                  <p className="text-xs text-text/80 leading-relaxed font-semibold whitespace-pre-line">{evalResult.summary}</p>
                </div>
              </div>

              <button
                onClick={() => setEvalResult(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-text py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-center"
              >
                Close Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Applications & Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Applications */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <h4 className="font-extrabold text-text text-base">Your Applications</h4>
          <div className="divide-y divide-border">
            {applications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted font-medium">
                No active applications filed. Choose an opening below to apply!
              </div>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="py-4 flex justify-between items-center text-xs font-semibold">
                  <div>
                    <h5 className="text-sm font-bold text-text">{app.job_post?.title || "Python Backend Engineer"}</h5>
                    <p className="text-muted text-[10px] mt-0.5">Applied: Match Score: **{app.match_percentage}%**</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-green-50 border border-green-200 text-primary px-2.5 py-0.5 rounded-full text-[10px]">
                      {app.status}
                    </span>
                    {app.status === 'INTERVIEWING' && (
                      <button
                        onClick={() => handleStartInterview(app.id)}
                        className="bg-primary hover:bg-primary-hover text-white px-3 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all shadow-sm"
                      >
                        Start Screening
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Available Job Positions */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-card space-y-4">
          <h4 className="font-extrabold text-text text-base">Available Job Openings</h4>
          <div className="divide-y divide-border">
            {jobs.map((job) => {
              // Check if already applied
              const applied = applications.some(a => a.job_post_id === job.id);
              
              return (
                <div key={job.id} className="py-4 flex justify-between items-center text-xs font-semibold">
                  <div>
                    <h5 className="text-sm font-bold text-text">{job.title}</h5>
                    <p className="text-muted text-[10px] mt-0.5">Salary: {job.salary_range} | Requirements: {job.requirements.slice(0, 2).join(', ')}</p>
                  </div>
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={applied || !candidate}
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-sm cursor-pointer ${
                      applied
                        ? 'bg-slate-50 border border-border text-muted cursor-not-allowed'
                        : !candidate
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary-hover text-white'
                    }`}
                  >
                    {applied ? "Applied" : "Apply Now"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
