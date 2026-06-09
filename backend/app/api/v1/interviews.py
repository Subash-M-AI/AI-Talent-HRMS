from typing import List
import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import Interview, Application, User, Candidate, JobPost, Notification
from app.schemas.schemas import InterviewResponse, InterviewCreate, InterviewUpdateHistory, InterviewEvaluate
from app.core.security import get_current_user, RoleChecker
from app.ai.conversational_recruiter import chat_respond, generate_screening_questions
from app.ai.voice_interview import evaluate_voice_interview
from app.ai.gemini_client import transcribe_audio_gemini

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interviews", tags=["Interviews"])

@router.post("/schedule", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def schedule_interview(
    setup: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "HR_RECRUITER", "CANDIDATE"]))
):
    """Schedules an AI-powered conversational or voice interview for an application."""
    # Find application
    app_res = await db.execute(
        select(Application)
        .filter(Application.id == setup.application_id)
        .options(selectinload(Application.candidate).selectinload(Candidate.user))
    )
    application = app_res.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Double check Candidate ownership
    if current_user.role == "CANDIDATE" and application.candidate.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to schedule for other applications.")

    # Create interview
    interview = Interview(
        application_id=setup.application_id,
        interview_type=setup.interview_type.upper(),
        status="SCHEDULED",
        chat_history=[]
    )
    db.add(interview)
    
    # Generate dynamic questions based on candidate's skills and job title (AI Feature 3)
    job_res = await db.execute(select(JobPost).filter(JobPost.id == application.job_post_id))
    job = job_res.scalars().first()
    
    skills = application.candidate.skills or ["Software Engineering"]
    title = job.title if job else "Software Engineer"
    
    questions = await generate_screening_questions(skills, title)
    
    # Pre-populate chat history with initial recruiter welcome and first question
    welcome_msg = (
        f"Hello {application.candidate.first_name}! Welcome to your AI Recruiter Screening for the **{title}** role. "
        "I will ask you a series of questions. Let's start with the first one:\n\n"
        f"**Question 1:** {questions[0]}"
    )
    
    interview.chat_history = [
        {"sender": "ai", "message": welcome_msg, "question_list": questions, "current_question_index": 0}
    ]
    
    application.status = "INTERVIEWING"
    await db.commit()
    await db.refresh(interview)
    return interview

@router.get("/{id}", response_model=InterviewResponse)
async def get_interview(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves specific interview session status and chat logs."""
    res = await db.execute(select(Interview).filter(Interview.id == id))
    interview = res.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    return interview

@router.post("/{id}/chat", response_model=InterviewResponse)
async def respond_to_recruiter(
    id: int,
    msg_in: InterviewUpdateHistory,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sends candidate response (or STT transcript) to the AI Conversational Recruiter and gets the next question."""
    # Find interview
    res = await db.execute(
        select(Interview)
        .filter(Interview.id == id)
        .options(selectinload(Interview.application).selectinload(Application.candidate))
    )
    interview = res.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    if interview.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="This interview session has already been submitted and completed.")

    # Access current question configuration
    history = list(interview.chat_history)
    first_turn = history[0] if history else {}
    questions = first_turn.get("question_list", ["Tell me about yourself."])
    curr_idx = first_turn.get("current_question_index", 0)

    # Save candidate's answer
    history.append({"sender": "candidate", "message": msg_in.message})
    curr_idx += 1

    ai_reply = ""
    is_last = curr_idx >= len(questions)

    if is_last:
        ai_reply = (
            "Thank you for sharing your responses! I have gathered all your answers. "
            "Click the 'Submit Interview' button to complete this round and generate your evaluation."
        )
    else:
        # Load next question
        next_question = questions[curr_idx]
        # Formulate response (optionally add simple transitions or feed context through chat recruiter)
        job_res = await db.execute(select(JobPost).filter(JobPost.id == interview.application.job_post_id))
        job = job_res.scalars().first()
        context = {
            "name": interview.application.candidate.first_name,
            "role": "Candidate",
            "job_title": job.title if job else "Developer",
            "app_status": "Interviewing"
        }
        
        transition = await chat_respond(
            chat_history=history[:-1], 
            user_message=f"[Transition response to answer: '{msg_in.message}' and transition to next question: '{next_question}']",
            context=context
        )
        # Combine transition feedback with next question
        ai_reply = f"{transition}\n\n**Next Question:** {next_question}"

    # Save recruiter reply
    history.append({"sender": "ai", "message": ai_reply})
    
    # Update state indices
    first_turn["current_question_index"] = curr_idx
    interview.chat_history = history
    
    # flag session as dirty to force sqlalchemy update detection
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(interview, "chat_history")
    
    await db.commit()
    await db.refresh(interview)
    return interview

@router.post("/{id}/chat-audio", response_model=InterviewResponse)
async def respond_to_recruiter_audio(
    id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Transcribes an uploaded audio file using Gemini, saves the transcribed candidate response, and returns the next question."""
    # Read the audio file
    file_bytes = await file.read()
    mime_type = file.content_type or "audio/webm"
    
    # Transcribe audio using Gemini
    logger.info(f"Transcribing audio response for interview {id} (size: {len(file_bytes)} bytes, mime: {mime_type})")
    transcript_text = await transcribe_audio_gemini(file_bytes, mime_type)
    
    if not transcript_text or not transcript_text.strip():
        # Fallback transcript if empty/failed
        transcript_text = "[Spoken Audio Response]"
        
    # Find interview
    res = await db.execute(
        select(Interview)
        .filter(Interview.id == id)
        .options(selectinload(Interview.application).selectinload(Application.candidate))
    )
    interview = res.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    if interview.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="This interview session has already been submitted and completed.")

    # Access current question configuration
    history = list(interview.chat_history)
    first_turn = history[0] if history else {}
    questions = first_turn.get("question_list", ["Tell me about yourself."])
    curr_idx = first_turn.get("current_question_index", 0)

    # Save candidate's answer
    history.append({"sender": "candidate", "message": transcript_text})
    curr_idx += 1

    ai_reply = ""
    is_last = curr_idx >= len(questions)

    if is_last:
        ai_reply = (
            "Thank you for sharing your responses! I have gathered all your answers. "
            "Click the 'Submit Interview' button to complete this round and generate your evaluation."
        )
    else:
        # Load next question
        next_question = questions[curr_idx]
        job_res = await db.execute(select(JobPost).filter(JobPost.id == interview.application.job_post_id))
        job = job_res.scalars().first()
        context = {
            "name": interview.application.candidate.first_name,
            "role": "Candidate",
            "job_title": job.title if job else "Developer",
            "app_status": "Interviewing"
        }
        
        transition = await chat_respond(
            chat_history=history[:-1], 
            user_message=f"[Transition response to answer: '{transcript_text}' and transition to next question: '{next_question}']",
            context=context
        )
        ai_reply = f"{transition}\n\n**Next Question:** {next_question}"

    # Save recruiter reply
    history.append({"sender": "ai", "message": ai_reply})
    
    # Update state indices
    first_turn["current_question_index"] = curr_idx
    interview.chat_history = history
    
    # flag session as dirty to force sqlalchemy update detection
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(interview, "chat_history")
    
    await db.commit()
    await db.refresh(interview)
    return interview

@router.post("/{id}/evaluate", response_model=InterviewResponse)
async def submit_and_evaluate_interview(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers the Voice Interview Evaluator (AI Feature 4), generating performance grades and scoring metrics."""
    res = await db.execute(
        select(Interview)
        .filter(Interview.id == id)
        .options(selectinload(Interview.application).selectinload(Application.candidate))
    )
    interview = res.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="This interview has already been evaluated.")

    # Extract questions and candidate answers from chat history
    history = interview.chat_history
    questions = []
    answers = []
    
    # Find raw questions in first turn
    if history:
        questions = history[0].get("question_list", [])

    # Retrieve matching candidate answers sequentially
    for turn in history:
        if turn.get("sender") == "candidate":
            answers.append(turn.get("message", ""))

    # Fallback if indices mismatches
    if not questions and answers:
        questions = [f"Question {i+1}" for i in range(len(answers))]

    job_res = await db.execute(select(JobPost).filter(JobPost.id == interview.application.job_post_id))
    job = job_res.scalars().first()
    job_title = job.title if job else "Software Engineer"

    # Evaluate (AI Feature 4)
    eval_report = await evaluate_voice_interview(questions, answers, job_title)

    # Save evaluations
    interview.technical_score = eval_report.get("technical_score", 50.0)
    interview.communication_score = eval_report.get("communication_score", 50.0)
    interview.confidence_score = eval_report.get("confidence_score", 50.0)
    interview.overall_score = eval_report.get("overall_score", 50.0)
    interview.summary = eval_report.get("summary", "")
    interview.status = "COMPLETED"
    
    # Update application status
    app = interview.application
    app.status = "SCREENED"
    app.ranking_score = (app.match_percentage + interview.overall_score) / 2.0  # weighted composite ranking index

    # Create recruiter notification
    rec_notif = Notification(
        user_id=1,  # Admin/Recruiter notifications
        message=f"Evaluation ready for candidate {app.candidate.first_name} {app.candidate.last_name} for the role {job_title}. Composite Score: {app.ranking_score}%",
        notification_type="INFO"
    )
    db.add(rec_notif)

    await db.commit()
    await db.refresh(interview)
    return interview
