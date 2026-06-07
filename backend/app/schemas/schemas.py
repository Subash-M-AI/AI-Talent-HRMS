from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: str = "EMPLOYEE"  # ADMIN, MANAGEMENT, SENIOR_MANAGER, HR_RECRUITER, EMPLOYEE, CANDIDATE
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str
    user_id: int

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# Employee Schemas
class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    job_title: str
    department_id: Optional[int] = None
    salary: float = 0.0
    current_skills: List[str] = []

class EmployeeCreate(EmployeeBase):
    email: EmailStr
    password: str
    role: str = "EMPLOYEE"

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[int] = None
    salary: Optional[float] = None
    current_skills: Optional[List[str]] = None
    performance_rating: Optional[float] = None

class EmployeeResponse(EmployeeBase):
    id: int
    user_id: int
    performance_rating: float
    hire_date: date
    created_at: datetime

    class Config:
        from_attributes = True

# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Attendance Schemas
class AttendancePunch(BaseModel):
    location: Optional[str] = "Office"

class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    date: date
    clock_in: datetime
    clock_out: Optional[datetime] = None
    status: str
    location: str

    class Config:
        from_attributes = True

# Leave Schemas
class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None

class LeaveRequestUpdate(BaseModel):
    status: str  # APPROVED, REJECTED

class LeaveRequestResponse(BaseModel):
    id: int
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str]
    status: str
    approved_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

# Job Schemas
class JobPostCreate(BaseModel):
    title: str
    description: str
    department_id: int
    requirements: List[str] = []
    salary_range: Optional[str] = None

class JobPostResponse(JobPostCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Candidate & Application Schemas
class CandidateResponse(BaseModel):
    id: int
    user_id: int
    first_name: str
    last_name: str
    phone: Optional[str]
    skills: List[str]
    experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    resume_summary: Optional[str]
    resume_score: int
    missing_skills: List[str]
    strengths: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: int
    candidate_id: int
    job_post_id: int
    status: str
    match_percentage: float
    ranking_score: float
    hiring_recommendation: Optional[str]
    applied_date: datetime
    candidate: Optional[CandidateResponse] = None

    class Config:
        from_attributes = True

# Interview Schemas
class InterviewCreate(BaseModel):
    application_id: int
    interview_type: str = "CHAT"  # CHAT, VOICE

class InterviewUpdateHistory(BaseModel):
    message: str
    sender: str  # candidate, ai

class InterviewEvaluate(BaseModel):
    answers: List[str]

class InterviewResponse(BaseModel):
    id: int
    application_id: int
    interview_type: str
    status: str
    scheduled_date: datetime
    chat_history: List[Dict[str, Any]]
    technical_score: float
    communication_score: float
    confidence_score: float
    overall_score: float
    summary: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Performance Review Schemas
class PerformanceReviewCreate(BaseModel):
    rating: float
    feedback: str
    goals: List[str] = []

class PerformanceReviewResponse(BaseModel):
    id: int
    employee_id: int
    reviewer_id: Optional[int]
    review_date: date
    rating: float
    feedback: str
    goals: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Skill Assessment Schemas
class SkillAssessmentCreate(BaseModel):
    target_role: str

class SkillAssessmentResponse(BaseModel):
    id: int
    employee_id: int
    current_role: str
    target_role: str
    missing_skills: List[str]
    learning_roadmap: List[Dict[str, Any]]
    courses: List[Dict[str, Any]]
    certifications: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

# Attrition Schemas
class AttritionPredictionResponse(BaseModel):
    id: int
    employee_id: int
    risk_score: float
    risk_level: str
    satisfaction_score: float
    work_life_balance: float
    environment_satisfaction: float
    training_times_last_year: int
    years_at_company: int
    performance_rating: float
    retention_strategy: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    message: str
    is_read: bool
    notification_type: str
    created_at: datetime

    class Config:
        from_attributes = True

# Copilot Request/Response
class CopilotRequest(BaseModel):
    query: str

class CopilotResponse(BaseModel):
    response: str
