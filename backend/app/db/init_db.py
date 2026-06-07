import logging
from .session import engine, Base
# Import models here to register them with metadata
from .models import User, Department, Employee, Attendance, LeaveRequest, JobPost, Candidate, Application, Interview, PerformanceReview, SkillAssessment, AttritionData, Notification

logger = logging.getLogger(__name__)

async def init_db():
    logger.info("Initializing database...")
    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully!")
