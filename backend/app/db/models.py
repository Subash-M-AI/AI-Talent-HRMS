import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, Float, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # ADMIN, MANAGEMENT, SENIOR_MANAGER, HR_RECRUITER, EMPLOYEE, CANDIDATE
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee_profile = relationship("Employee", back_populates="user", uselist=False)
    candidate_profile = relationship("Candidate", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employees = relationship("Employee", back_populates="department")
    job_posts = relationship("JobPost", back_populates="department")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), index=True, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    job_title = Column(String(100), nullable=False)
    hire_date = Column(Date, nullable=False, default=datetime.date.today)
    salary = Column(Float, nullable=False, default=0.0)
    current_skills = Column(JSON, default=list)  # List of strings: ["Python", "FastAPI", "React"]
    performance_rating = Column(Float, default=3.0)  # Out of 5.0
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="employee_profile")
    department = relationship("Department", back_populates="employees")
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", foreign_keys="LeaveRequest.employee_id", back_populates="employee", cascade="all, delete-orphan")
    performance_reviews = relationship("PerformanceReview", foreign_keys="PerformanceReview.employee_id", back_populates="employee", cascade="all, delete-orphan")
    skill_assessments = relationship("SkillAssessment", back_populates="employee", cascade="all, delete-orphan")
    attrition_data = relationship("AttritionData", back_populates="employee", uselist=False, cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(Date, nullable=False, default=datetime.date.today, index=True)
    clock_in = Column(DateTime(timezone=True), nullable=False, default=func.now())
    clock_out = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, default="PRESENT")  # PRESENT, ABSENT, LATE, REMOTE
    location = Column(String(100), default="Office")

    # Relationships
    employee = relationship("Employee", back_populates="attendance_records")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False)
    leave_type = Column(String(50), nullable=False)  # SICK, CASUAL, PAID, UNPAID
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED
    approved_by = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="leave_requests")

class JobPost(Base):
    __tablename__ = "job_posts"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=False)
    requirements = Column(JSON, default=list)  # List of strings: ["5+ years Python", "React", "Postgres"]
    salary_range = Column(String(100), nullable=True)  # e.g. "$120,000 - $150,000"
    status = Column(String(50), nullable=False, default="OPEN")  # OPEN, CLOSED, DRAFT
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    department = relationship("Department", back_populates="job_posts")
    applications = relationship("Application", back_populates="job_post", cascade="all, delete-orphan")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    resume_url = Column(String(255), nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=True)
    skills = Column(JSON, default=list)  # List of strings
    experience = Column(JSON, default=list)  # Rich JSON array of companies, titles, years
    education = Column(JSON, default=list)  # Rich JSON array
    projects = Column(JSON, default=list)  # Rich JSON array
    resume_summary = Column(Text, nullable=True)
    resume_score = Column(Integer, default=0)  # Score out of 100
    missing_skills = Column(JSON, default=list)  # List of strings
    strengths = Column(JSON, default=list)  # List of strings
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="candidate_profile")
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), index=True, nullable=False)
    job_post_id = Column(Integer, ForeignKey("job_posts.id", ondelete="CASCADE"), index=True, nullable=False)
    status = Column(String(50), nullable=False, default="APPLIED")  # APPLIED, SCREENED, INTERVIEWING, OFFERED, REJECTED
    match_percentage = Column(Float, default=0.0)  # Cosine match percentage
    ranking_score = Column(Float, default=0.0)  # Calculated index ranking
    hiring_recommendation = Column(Text, nullable=True)  # Gemini assessment text
    applied_date = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    candidate = relationship("Candidate", back_populates="applications")
    job_post = relationship("JobPost", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), index=True, nullable=False)
    interview_type = Column(String(50), nullable=False, default="CHAT")  # CHAT, VOICE
    status = Column(String(50), nullable=False, default="SCHEDULED")  # SCHEDULED, COMPLETED, CANCELLED
    scheduled_date = Column(DateTime(timezone=True), server_default=func.now())
    chat_history = Column(JSON, default=list)  # List of dicts: [{"sender": "ai"/"candidate", "message": "..."}]
    technical_score = Column(Float, default=0.0)  # Out of 100
    communication_score = Column(Float, default=0.0)  # Out of 100
    confidence_score = Column(Float, default=0.0)  # Out of 100
    overall_score = Column(Float, default=0.0)  # Out of 100
    summary = Column(Text, nullable=True)  # Evaluation summary text
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="interviews")

class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False)
    reviewer_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    review_date = Column(Date, nullable=False, default=datetime.date.today)
    rating = Column(Float, nullable=False, default=3.0)  # Out of 5.0
    feedback = Column(Text, nullable=False)
    goals = Column(JSON, default=list)  # List of goals
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="performance_reviews")
    reviewer = relationship("Employee", foreign_keys=[reviewer_id])

class SkillAssessment(Base):
    __tablename__ = "skill_assessments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False)
    current_role = Column(String(100), nullable=False)
    target_role = Column(String(100), nullable=False)
    missing_skills = Column(JSON, default=list)  # List of strings
    learning_roadmap = Column(JSON, default=list)  # Roadmap steps
    courses = Column(JSON, default=list)  # Recommended courses
    certifications = Column(JSON, default=list)  # Recommended certs
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="skill_assessments")

class AttritionData(Base):
    __tablename__ = "attrition_data"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    risk_score = Column(Float, default=0.0)  # 0 to 100 percentage
    risk_level = Column(String(50), default="LOW")  # LOW, MEDIUM, HIGH
    satisfaction_score = Column(Float, default=4.0)  # Employee satisfaction (1 to 5)
    work_life_balance = Column(Float, default=4.0)  # 1 to 5
    environment_satisfaction = Column(Float, default=4.0)  # 1 to 5
    training_times_last_year = Column(Integer, default=2)
    years_at_company = Column(Integer, default=1)
    performance_rating = Column(Float, default=3.0)
    retention_strategy = Column(Text, nullable=True)  # AI-generated retention strategy
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="attrition_data")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    notification_type = Column(String(50), default="INFO")  # INFO, ALERT, SUCCESS
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")
