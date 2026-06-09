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
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [baseTranscript, setBaseTranscript] = useState('');
  const baseTranscriptRef = React.useRef('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);

  const updateBaseTranscript = (val: string) => {
    setBaseTranscript(val);
    baseTranscriptRef.current = val;
  };

  useEffect(() => {
    loadData();
    setupSpeechRecognition();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeInterview?.chat_history]);

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

      // Restore active (SCHEDULED) interview session on load if candidate is in the middle of it
      let activeIv = null;
      if (appsRes && appsRes.length > 0) {
        for (const app of appsRes) {
          if (app.interviews && app.interviews.length > 0) {
            const ongoing = app.interviews.find((iv: any) => iv.status === 'SCHEDULED');
            if (ongoing) {
              activeIv = ongoing;
              break;
            }
          }
        }
      }
      if (activeIv) {
        setActiveInterview(activeIv);
        const history = activeIv.chat_history || [];
        const latestAiTurn = [...history].reverse().find((chat: any) => chat.sender === 'ai');
        setCurrentQuestion(latestAiTurn ? latestAiTurn.message : '');
      }
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
          let sessionText = '';
          for (let i = 0; i < event.results.length; ++i) {
            sessionText += event.results[i][0].transcript;
          }
          
          setTranscript(() => {
            const base = baseTranscriptRef.current;
            return base 
              ? base + " " + sessionText.trim() 
              : sessionText.trim();
          });
        };

        recognition.onerror = (e: any) => {
          console.warn("Speech recognition error: ", e);
          setRecording(false);
          if (e.error === 'not-allowed') {
            setInterviewStatusText("Microphone access denied. Please enable microphone permissions in your browser or type your answer.");
          } else if (e.error === 'no-speech') {
            setInterviewStatusText("No speech detected. Please try again or type your answer.");
          } else {
            setInterviewStatusText(`Microphone error: ${e.error || 'unknown'}. Please type your answer.`);
          }
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

  const toggleRecording = async () => {
    if (!speechRecognizer) {
      alert("Speech recognition API is not supported in this browser. Please type your responses.");
      return;
    }

    if (recording) {
      // Stop media recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Stop speech recognizer
      speechRecognizer.stop();
      setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        audioChunksRef.current = [];
        let mediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        } catch (e) {
          mediaRecorder = new MediaRecorder(stream);
        }
        
        mediaRecorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
        };
        
        mediaRecorderRef.current = mediaRecorder;
        
        // Update transcription base text
        updateBaseTranscript(transcript.trim());
        
        // Start both
        mediaRecorder.start();
        speechRecognizer.start();
        setRecording(true);
        setAudioBlob(null); // Clear previous recording
      } catch (err: any) {
        console.error("Error accessing microphone:", err);
        alert("Microphone access is required to record audio responses. Please enable microphone permissions or type your response.");
      }
    }
  };

  const handleSendAnswer = async () => {
    if (!activeInterview) return;

    const hasAudio = !!audioBlob;
    const hasText = !!transcript.trim();
    if (!hasAudio && !hasText) return;

    // Cleanup recording if running
    setRecording(false);
    if (speechRecognizer) speechRecognizer.stop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      setInterviewStatusText(hasAudio ? "Uploading audio recording and transcribing..." : "Submitting answer and loading next question...");
      
      let updatedSession;
      if (hasAudio && audioBlob) {
        updatedSession = await api.sendInterviewChatAudio(activeInterview.id, audioBlob);
      } else {
        updatedSession = await api.sendInterviewChat(activeInterview.id, transcript);
      }
      
      setActiveInterview(updatedSession);
      setTranscript('');
      setAudioBlob(null); // Clear active audio blob
      
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
    // Cleanup any active recordings
    setRecording(false);
    if (speechRecognizer) speechRecognizer.stop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      let currentSession = activeInterview;
      
      // If there is an unsent answer (audio or text), send it first!
      if (audioBlob) {
        setInterviewStatusText("Uploading final audio recording and transcribing before evaluation...");
        currentSession = await api.sendInterviewChatAudio(activeInterview.id, audioBlob);
        setActiveInterview(currentSession);
        setAudioBlob(null);
        setTranscript('');
      } else if (transcript.trim()) {
        setInterviewStatusText("Submitting final response before evaluation...");
        currentSession = await api.sendInterviewChat(activeInterview.id, transcript);
        setActiveInterview(currentSession);
        setTranscript('');
      }

      setInterviewStatusText("Compiling screening report and generating feedback...");
      const evaluated = await api.evaluateInterview(currentSession.id);
      setEvalResult(evaluated);
      setActiveInterview(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Evaluation failed.");
    } finally {
      setEvalLoading(false);
      setInterviewStatusText('');
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
            <div className="border-t border-border mt-5 pt-4 space-y-3 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-muted font-semibold">Extracted Name:</span>
                <span className="text-text font-bold">{candidate.first_name} {candidate.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-semibold">AI Profile Score:</span>
                <span className="text-primary font-bold">{candidate.resume_score}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-semibold">Suitable Role:</span>
                <span className="text-text font-bold">{candidate.suitable_role || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted font-semibold block mb-1">Parsed Core Skills:</span>
                <div className="flex flex-wrap gap-1">
                  {candidate.skills.map((skill: string, idx: number) => (
                    <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-text font-semibold">{skill}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted font-semibold block mb-1 mt-2">Projects:</span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {candidate.projects && candidate.projects.length > 0 ? (
                    candidate.projects.map((proj: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-100">
                        <p className="font-bold text-text text-[11px]">{proj.name || proj.title}</p>
                        <p className="text-muted text-[10px] mt-0.5">{proj.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted text-[10px] italic">No projects found.</p>
                  )}
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
          
          {/* Default Screen & Application Status-based Screen */}
          {!activeInterview && !evalResult && !evalLoading && (
            (() => {
              const interviewingApp = applications.find(app => app.status === 'INTERVIEWING');
              const screenedApp = applications.find(app => app.status === 'SCREENED');
              const offeredApp = applications.find(app => app.status === 'OFFERED');
              const rejectedApp = applications.find(app => app.status === 'REJECTED');

              if (offeredApp) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8 px-4 bg-green-50/30 rounded-2xl border border-green-100">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-bounce">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-green-700 text-lg">Congratulations! 🎉</h4>
                      <p className="text-sm font-bold text-green-600">Application Approved & Selected</p>
                    </div>
                    <p className="text-xs text-muted max-w-md">
                      We are thrilled to offer you a position at our company! Our recruitment team has reviewed your AI Voice Screening performance and approved your profile. Please check your inbox for the official offer letter and next steps.
                    </p>
                  </div>
                );
              }

              if (rejectedApp) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8 px-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <ShieldAlert className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-700 text-base">Application Closed</h4>
                      <p className="text-xs font-semibold text-slate-500">Screening Process Complete</p>
                    </div>
                    <p className="text-xs text-muted max-w-md">
                      Thank you for your interest and for completing the AI Voice Screening round. While we were impressed by your background, we have decided to move forward with other candidates who more closely fit our current project needs. We wish you the best in your career search!
                    </p>
                  </div>
                );
              }

              if (interviewingApp) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8 px-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
                      <Mic className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-text text-base">AI Voice Screening Invitation</h4>
                      <p className="text-xs text-muted">You have been invited to participate in a voice recruiter interview screening.</p>
                    </div>
                    <button
                      onClick={() => handleStartInterview(interviewingApp.id)}
                      className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold text-xs shadow-soft cursor-pointer transition-all flex items-center gap-2"
                    >
                      <Mic className="w-4 h-4" /> Start AI Voice Screening
                    </button>
                    <span className="text-[10px] text-muted font-bold">Requires microphone access | ~10 mins</span>
                  </div>
                );
              }

              if (screenedApp) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8 px-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
                      <Sparkles className="w-10 h-10 animate-spin-slow" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-text text-base">Screening Under Review</h4>
                      <p className="text-xs text-muted">AI evaluation completed successfully.</p>
                    </div>
                    <p className="text-xs text-muted max-w-sm">
                      Your voice screening responses have been analyzed and graded. The HR Recruiting team is currently reviewing the composite report and feedback. You will see their decision here soon!
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-8 text-muted">
                  <Mic className="w-12 h-12 text-slate-200" />
                  <h5 className="font-bold text-text text-sm">Voice Recruiter Inactive</h5>
                  <p className="text-xs max-w-sm">When your application status changes to 'Interviewing', click 'Start Screening' to begin your automated verbal evaluation.</p>
                </div>
              );
            })()
          )}

          {/* Active Voice Interview Screen */}
          {activeInterview && (
            (() => {
              const firstTurn = activeInterview?.chat_history?.[0];
              const questions = firstTurn?.question_list || [];
              const currentIdx = firstTurn?.current_question_index || 0;
              const isFinished = currentIdx >= questions.length;

              return (
                <div className="flex-1 flex flex-col justify-between space-y-4 pt-2">
                  <div className="space-y-4 flex flex-col flex-1">
                    {/* Chat Dialogue History */}
                    <div className="flex-1 overflow-y-auto space-y-4 max-h-[280px] min-h-[180px] p-4 bg-slate-50 border border-slate-100 rounded-2xl pr-2">
                      {activeInterview.chat_history.map((chat: any, idx: number) => {
                        const isAI = chat.sender === 'ai';
                        return (
                          <div key={idx} className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
                            {isAI && (
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                AI
                              </div>
                            )}
                            <div className={`p-3.5 rounded-2xl max-w-[80%] text-sm font-medium shadow-sm ${
                              isAI 
                                ? 'bg-white border border-border text-text' 
                                : 'bg-primary text-white'
                            }`}>
                              <p className="whitespace-pre-line leading-relaxed">{chat.message}</p>
                            </div>
                            {!isAI && (
                              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                U
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                    
                    {/* Answer Input Area (Speech or Typing) */}
                    {!isFinished ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                            Your Answer {recording && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />}
                          </label>
                          <span className="text-[10px] text-muted font-bold">You can type or use the microphone</span>
                        </div>
                        
                        <div className="flex gap-2 items-end">
                          <textarea
                            value={transcript}
                            onChange={(e) => {
                              setTranscript(e.target.value);
                              if (audioBlob) setAudioBlob(null);
                            }}
                            placeholder="Speak clearly or type your response here..."
                            className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl min-h-[60px] max-h-[120px] text-sm text-text font-medium focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all resize-y"
                            disabled={evalLoading}
                          />
                          
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={toggleRecording}
                              className={`p-3 rounded-2xl shadow-soft cursor-pointer transition-all flex items-center justify-center ${
                                recording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                              title={recording ? "Stop Recording" : "Record Answer"}
                            >
                              <Mic className="w-5 h-5" />
                            </button>
                            
                            <button
                              onClick={() => speakText(currentQuestion)}
                              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl cursor-pointer transition-all flex items-center justify-center"
                              title="Read Question Out Loud"
                            >
                              <Volume2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-center text-xs font-bold text-green-700">
                        🎉 All questions completed! Click the "Finish Interview & Submit Report" button below to compile and send your screening evaluation.
                      </div>
                    )}
                  </div>

                  {/* Status indicators */}
                  <div className="flex flex-col gap-1.5">
                    {audioBlob && (
                      <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold bg-green-50 border border-green-100 px-3 py-1.5 rounded-xl self-start">
                        <CheckCircle className="w-3.5 h-3.5" /> Audio response captured (Ready to send or submit)
                      </div>
                    )}
                    {interviewStatusText && (
                      <p className="text-[10px] text-primary font-bold animate-pulse">{interviewStatusText}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center border-t border-border pt-4 mt-2">
                    <button
                      onClick={handleEvaluateInterview}
                      disabled={evalLoading}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-soft cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Finish & Submit Interview
                    </button>

                    {!isFinished && (
                      <button
                        onClick={handleSendAnswer}
                        disabled={(!transcript.trim() && !audioBlob) || evalLoading}
                        className="bg-primary hover:bg-primary-hover disabled:bg-slate-100 disabled:text-slate-400 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-soft cursor-pointer transition-all"
                      >
                        Send Answer
                      </button>
                    )}
                  </div>
                </div>
              );
            })()
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
