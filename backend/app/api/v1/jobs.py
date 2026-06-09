from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import JobPost, User
from app.schemas.schemas import JobPostResponse, JobPostCreate
from app.core.security import get_current_user, RoleChecker

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/", response_model=List[JobPostResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    """Lists all open jobs."""
    res = await db.execute(select(JobPost).filter(JobPost.status == "OPEN").order_by(JobPost.created_at.desc()))
    return res.scalars().all()

@router.post("/", response_model=JobPostResponse, status_code=status.HTTP_201_CREATED)
async def create_job_post(
    job_in: JobPostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "HR_RECRUITER", "MANAGER"]))
):
    """Creates a new job opening."""
    job = JobPost(
        department_id=job_in.department_id,
        title=job_in.title,
        description=job_in.description,
        requirements=job_in.requirements,
        salary_range=job_in.salary_range,
        status="OPEN"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job

@router.get("/{id}", response_model=JobPostResponse)
async def get_job_post(id: int, db: AsyncSession = Depends(get_db)):
    """Retrieves a specific job details."""
    res = await db.execute(select(JobPost).filter(JobPost.id == id))
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return job
