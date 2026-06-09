from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import Candidate, User, Application, JobPost
from app.schemas.schemas import CandidateResponse, ApplicationResponse
from app.core.security import get_current_user, RoleChecker
from app.ai.resume_engine import parse_resume
from app.ai.ranking_engine import rank_candidate_against_job

router = APIRouter(prefix="/candidates", tags=["Candidates"])

def serialize_application(application: Application) -> dict:
    candidate = application.candidate
    # Find active or completed interview if it exists
    interviews = []
    if hasattr(application, 'interviews') and application.interviews:
        for iv in application.interviews:
            interviews.append({
                "id": iv.id,
                "interview_type": iv.interview_type,
                "status": iv.status,
                "technical_score": iv.technical_score,
                "communication_score": iv.communication_score,
                "confidence_score": iv.confidence_score,
                "overall_score": iv.overall_score,
                "summary": iv.summary,
                "chat_history": iv.chat_history
            })
    return {
        "id": application.id,
        "candidate_id": application.candidate_id,
        "job_post_id": application.job_post_id,
        "status": application.status,
        "match_percentage": application.match_percentage,
        "ranking_score": application.ranking_score,
        "hiring_recommendation": application.hiring_recommendation,
        "applied_date": application.applied_date,
        "candidate": candidate,
        "interviews": interviews
    }

@router.post("/upload-resume", response_model=CandidateResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Uploads and parses a PDF resume using the Resume Intelligence Engine."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")
        
    contents = await file.read()
    
    # Run the Resume Intelligence Engine (AI Feature 1)
    parsed_data = await parse_resume(contents)
    
    # Find or create candidate profile
    cand_res = await db.execute(select(Candidate).filter(Candidate.user_id == current_user.id))
    cand = cand_res.scalars().first()
    
    if not cand:
        cand = Candidate(
            user_id=current_user.id,
            first_name=parsed_data.get("first_name", "John"),
            last_name=parsed_data.get("last_name", "Doe"),
            phone=parsed_data.get("phone", "")
        )
        db.add(cand)
        
    # Update candidate fields with parsed info
    cand.first_name = parsed_data.get("first_name", cand.first_name)
    cand.last_name = parsed_data.get("last_name", cand.last_name)
    cand.phone = parsed_data.get("phone", cand.phone)
    cand.skills = parsed_data.get("skills", [])
    cand.experience = parsed_data.get("experience", [])
    cand.education = parsed_data.get("education", [])
    cand.projects = parsed_data.get("projects", [])
    cand.resume_summary = parsed_data.get("resume_summary", "")
    cand.resume_score = parsed_data.get("resume_score", 0)
    cand.missing_skills = parsed_data.get("missing_skills", [])
    cand.strengths = parsed_data.get("strengths", [])
    cand.suitable_role = parsed_data.get("suitable_role", "Software Engineer")
    
    await db.commit()
    await db.refresh(cand)
    return cand

@router.get("/me/profile", response_model=CandidateResponse)
async def get_candidate_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves the candidate's own parsed profile."""
    cand_res = await db.execute(select(Candidate).filter(Candidate.user_id == current_user.id))
    cand = cand_res.scalars().first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate profile not found. Please upload resume first.")
    return cand

@router.post("/apply/{job_id}", response_model=ApplicationResponse)
async def apply_for_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submits application for a job post and triggers Candidate Ranking Engine."""
    # Find candidate profile
    cand_res = await db.execute(select(Candidate).filter(Candidate.user_id == current_user.id))
    cand = cand_res.scalars().first()
    if not cand:
        raise HTTPException(status_code=400, detail="Please upload your resume before applying.")
        
    # Check if job exists
    job_res = await db.execute(select(JobPost).filter(JobPost.id == job_id))
    job = job_res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
        
    # Check if already applied
    app_res = await db.execute(
        select(Application).filter(
            Application.candidate_id == cand.id,
            Application.job_post_id == job_id
        )
    )
    existing = app_res.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied for this job.")

    # Convert Candidate info to parsed structure for comparison
    cand_info = {
        "skills": cand.skills,
        "resume_summary": cand.resume_summary,
        "experience": cand.experience
    }
    
    # Run Candidate Ranking Engine (AI Feature 2)
    ranking_data = await rank_candidate_against_job(
        resume_json=cand_info,
        job_description=job.description,
        job_requirements=job.requirements
    )
    
    application = Application(
        candidate_id=cand.id,
        job_post_id=job_id,
        status="APPLIED",
        match_percentage=ranking_data.get("match_percentage", 50.0),
        ranking_score=ranking_data.get("match_percentage", 50.0), # baseline index
        hiring_recommendation=ranking_data.get("hiring_recommendation", "")
    )
    db.add(application)
    await db.commit()
    app_res = await db.execute(
        select(Application)
        .filter(Application.id == application.id)
        .options(selectinload(Application.candidate), selectinload(Application.interviews))
    )
    return serialize_application(app_res.scalars().first())

@router.get("/my-applications", response_model=List[ApplicationResponse])
async def my_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists applications submitted by the logged-in candidate."""
    cand_res = await db.execute(select(Candidate).filter(Candidate.user_id == current_user.id))
    cand = cand_res.scalars().first()
    if not cand:
        return []
        
    res = await db.execute(
        select(Application)
        .filter(Application.candidate_id == cand.id)
        .options(
            selectinload(Application.candidate), 
            selectinload(Application.job_post),
            selectinload(Application.interviews)
        )
        .order_by(Application.applied_date.desc())
    )
    return [serialize_application(app) for app in res.scalars().all()]

@router.get("/rankings/{job_id}", response_model=List[ApplicationResponse])
async def get_candidate_rankings(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "HR_RECRUITER", "MANAGER"]))
):
    """Retrieves all job applications ranked by semantic similarity (AI Feature 2)."""
    res = await db.execute(
        select(Application)
        .filter(Application.job_post_id == job_id)
        .options(
            selectinload(Application.candidate), 
            selectinload(Application.job_post),
            selectinload(Application.interviews)
        )
        .order_by(Application.match_percentage.desc())
    )
    return [serialize_application(app) for app in res.scalars().all()]

@router.post("/applications/{app_id}/approve-screening", response_model=ApplicationResponse)
async def approve_screening(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "HR_RECRUITER", "MANAGER"]))
):
    """Invites a candidate to the AI Voice Screening (status -> INTERVIEWING)."""
    res = await db.execute(
        select(Application)
        .filter(Application.id == app_id)
        .options(selectinload(Application.candidate))
    )
    application = res.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
        
    application.status = "INTERVIEWING"
    await db.commit()
    
    app_res = await db.execute(
        select(Application)
        .filter(Application.id == app_id)
        .options(
            selectinload(Application.candidate), 
            selectinload(Application.job_post),
            selectinload(Application.interviews)
        )
    )
    return serialize_application(app_res.scalars().first())

@router.post("/applications/{app_id}/accept", response_model=ApplicationResponse)
async def accept_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "HR_RECRUITER", "MANAGER"]))
):
    """Accepts a candidate after screening (status -> OFFERED)."""
    res = await db.execute(
        select(Application)
        .filter(Application.id == app_id)
        .options(selectinload(Application.candidate))
    )
    application = res.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
        
    application.status = "OFFERED"
    await db.commit()
    
    app_res = await db.execute(
        select(Application)
        .filter(Application.id == app_id)
        .options(
            selectinload(Application.candidate), 
            selectinload(Application.job_post),
            selectinload(Application.interviews)
        )
    )
    return serialize_application(app_res.scalars().first())

@router.post("/applications/{app_id}/reject", response_model=ApplicationResponse)
async def reject_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "HR_RECRUITER", "MANAGER"]))
):
    """Rejects a candidate after screening (status -> REJECTED)."""
    res = await db.execute(
        select(Application)
        .filter(Application.id == app_id)
        .options(selectinload(Application.candidate))
    )
    application = res.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
        
    application.status = "REJECTED"
    await db.commit()
    
    app_res = await db.execute(
        select(Application)
        .filter(Application.id == app_id)
        .options(
            selectinload(Application.candidate), 
            selectinload(Application.job_post),
            selectinload(Application.interviews)
        )
    )
    return serialize_application(app_res.scalars().first())
