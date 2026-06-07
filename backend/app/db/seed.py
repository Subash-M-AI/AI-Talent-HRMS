import asyncio
import datetime
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal, engine, Base
from app.db.models import User, Department, Employee, Attendance, LeaveRequest, JobPost, Candidate, Application, Interview, PerformanceReview, SkillAssessment, AttritionData, Notification
from app.core.security import get_password_hash

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_data():
    logger.info("Starting database seeding...")
    async with AsyncSessionLocal() as session:
        # Check if users already seeded
        result = await session.execute(select(User))
        if result.scalars().first():
            logger.info("Database already contains data, skipping seeding.")
            return

        # 1. Create Departments
        logger.info("Seeding departments...")
        eng = Department(name="Engineering", description="Software development, DevOps, and AI engineering teams.")
        hr = Department(name="Human Resources", description="Talent acquisition, employee welfare, and operations.")
        prod = Department(name="Product & Design", description="Product management, UI/UX design, and growth.")
        sales = Department(name="Sales & Marketing", description="Enterprise sales, customer success, and outbound marketing.")
        session.add_all([eng, hr, prod, sales])
        await session.flush()

        # 2. Seed Users
        logger.info("Seeding users...")
        users = [
            User(email="admin@hrms.com", hashed_password=get_password_hash("admin123"), role="ADMIN"),
            User(email="ceo@hrms.com", hashed_password=get_password_hash("ceo123"), role="MANAGEMENT"),
            User(email="manager@hrms.com", hashed_password=get_password_hash("manager123"), role="SENIOR_MANAGER"),
            User(email="recruiter@hrms.com", hashed_password=get_password_hash("recruiter123"), role="HR_RECRUITER"),
            User(email="employee@hrms.com", hashed_password=get_password_hash("employee123"), role="EMPLOYEE"),
            User(email="candidate@hrms.com", hashed_password=get_password_hash("candidate123"), role="CANDIDATE"),
            # Additional Employees
            User(email="jane.doe@hrms.com", hashed_password=get_password_hash("employee123"), role="EMPLOYEE"),
            User(email="bob.smith@hrms.com", hashed_password=get_password_hash("employee123"), role="EMPLOYEE"),
            User(email="alice.jones@hrms.com", hashed_password=get_password_hash("employee123"), role="EMPLOYEE"),
        ]
        session.add_all(users)
        await session.flush()

        # 3. Seed Employee Profiles
        logger.info("Seeding employee profiles...")
        employees = [
            # CEO
            Employee(
                user_id=users[1].id, department_id=prod.id, first_name="Arthur", last_name="Pendragon",
                job_title="CEO", hire_date=datetime.date(2021, 6, 1), salary=250000.0,
                current_skills=["Leadership", "Strategy", "Public Speaking"], performance_rating=4.8
            ),
            # Manager
            Employee(
                user_id=users[2].id, department_id=eng.id, first_name="Guinevere", last_name="Merlin",
                job_title="Engineering Director", hire_date=datetime.date(2022, 1, 15), salary=160000.0,
                current_skills=["System Design", "Agile Management", "Java", "Python"], performance_rating=4.5
            ),
            # Recruiter
            Employee(
                user_id=users[3].id, department_id=hr.id, first_name="Lancelot", last_name="Lake",
                job_title="HR Lead Recruiter", hire_date=datetime.date(2022, 10, 1), salary=85000.0,
                current_skills=["Recruitment", "Sourcing", "Communication", "Talent Branding"], performance_rating=4.2
            ),
            # Employee (Dev 1)
            Employee(
                user_id=users[4].id, department_id=eng.id, first_name="Galahad", last_name="Pure",
                job_title="Senior Frontend Engineer", hire_date=datetime.date(2023, 3, 10), salary=120000.0,
                current_skills=["React", "TypeScript", "Tailwind CSS", "Next.js", "Jest"], performance_rating=4.0
            ),
            # Employee (Dev 2)
            Employee(
                user_id=users[6].id, department_id=eng.id, first_name="Jane", last_name="Doe",
                job_title="Backend Developer", hire_date=datetime.date(2024, 1, 10), salary=95000.0,
                current_skills=["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"], performance_rating=4.1
            ),
            # Employee (Dev 3)
            Employee(
                user_id=users[7].id, department_id=sales.id, first_name="Bob", last_name="Smith",
                job_title="Sales Executive", hire_date=datetime.date(2023, 8, 1), salary=75000.0,
                current_skills=["Negotiation", "Salesforce", "Communication"], performance_rating=3.2
            ),
            # Employee (Dev 4)
            Employee(
                user_id=users[8].id, department_id=prod.id, first_name="Alice", last_name="Jones",
                job_title="Product Manager", hire_date=datetime.date(2022, 11, 20), salary=110000.0,
                current_skills=["Agile Roadmap", "Jira", "Figma", "User Analytics"], performance_rating=4.6
            ),
        ]
        session.add_all(employees)
        await session.flush()

        # 4. Seed Attendance Records
        logger.info("Seeding attendance records...")
        today = datetime.date.today()
        for emp in employees:
            # Seed last 5 work days
            for d in range(5):
                day = today - datetime.timedelta(days=d)
                if day.weekday() < 5:  # Workdays only
                    # Clock in around 9:00 AM
                    hour = 9 if d % 2 == 0 else 8
                    minute = 10 if d % 3 == 0 else 45
                    status_str = "PRESENT"
                    if hour == 9 and minute > 30:
                        status_str = "LATE"
                    
                    clock_in_time = datetime.datetime.combine(day, datetime.time(hour, minute))
                    clock_out_time = datetime.datetime.combine(day, datetime.time(17, 30))
                    
                    att = Attendance(
                        employee_id=emp.id,
                        date=day,
                        clock_in=clock_in_time,
                        clock_out=clock_out_time,
                        status=status_str,
                        location="Office" if d % 3 != 0 else "Remote"
                    )
                    session.add(att)
        await session.flush()

        # 5. Seed Leave Requests
        logger.info("Seeding leave requests...")
        leaves = [
            LeaveRequest(
                employee_id=employees[3].id, leave_type="PAID",
                start_date=today + datetime.timedelta(days=10),
                end_date=today + datetime.timedelta(days=14),
                reason="Family vacation trip.", status="PENDING"
            ),
            LeaveRequest(
                employee_id=employees[4].id, leave_type="SICK",
                start_date=today - datetime.timedelta(days=10),
                end_date=today - datetime.timedelta(days=9),
                reason="Flu recovery.", status="APPROVED", approved_by=employees[1].id
            ),
        ]
        session.add_all(leaves)
        await session.flush()

        # 6. Seed Job Posts
        logger.info("Seeding job posts...")
        jobs = [
            JobPost(
                department_id=eng.id, title="Senior Python & AI Engineer",
                description="We are seeking a senior backend engineer skilled in FastAPI, PostgreSQL, and LLM orchestration (Gemini/OpenAI) to build cutting-edge automation apps.",
                requirements=["5+ years Python development", "Experience with FastAPI or Django", "PostgreSQL schema design", "Familiarity with LangChain or Gemini API"],
                salary_range="$130,000 - $160,000", status="OPEN"
            ),
            JobPost(
                department_id=eng.id, title="Frontend React Developer",
                description="Looking for a React developer proficient in Next.js 14/15, Tailwind CSS, TypeScript, and state management via Zustand.",
                requirements=["3+ years React development", "TypeScript & Next.js production experience", "Tailwind CSS", "Zustand or Redux stores"],
                salary_range="$100,000 - $125,000", status="OPEN"
            ),
        ]
        session.add_all(jobs)
        await session.flush()

        # 7. Seed Candidate & Applications
        logger.info("Seeding candidates & applications...")
        candidate = Candidate(
            user_id=users[5].id, first_name="Gawain", last_name="Strength", phone="+1-555-0199",
            skills=["Python", "FastAPI", "React", "Docker", "Machine Learning"],
            experience=[{"company": "Software Labs", "role": "Full-Stack Dev", "duration": "2 years"}],
            education=[{"degree": "B.S. Software Engineering", "school": "Camelot University", "year": "2022"}],
            projects=[{"name": "ML Model Ops", "description": "Automated pipeline for model containerization."}],
            resume_summary="Energetic Full-Stack Software Developer with 2 years experience deploying high-performance APIs and frontend components.",
            resume_score=85, missing_skills=["LangChain", "Kubernetes"],
            strengths=["Proficient in Python/FastAPI backend setup", "Strong containerization skills with Docker"]
        )
        session.add(candidate)
        await session.flush()

        app = Application(
            candidate_id=candidate.id, job_post_id=jobs[0].id, status="SCREENED",
            match_percentage=82.5, ranking_score=83.0,
            hiring_recommendation="Gawain has an excellent alignment in Python and FastAPI. Though missing Kubernetes, their experience deploying dockerized ML apps matches the team stack. Highly recommended to proceed."
        )
        session.add(app)
        await session.flush()

        # 8. Seed Performance Reviews
        logger.info("Seeding performance reviews...")
        review = PerformanceReview(
            employee_id=employees[3].id, reviewer_id=employees[1].id,
            rating=4.2, feedback="Galahad has done an outstanding job building our frontend libraries. They communicate technical choices clearly and collaborate well across features.",
            goals=["Optimize frontend builds for mobile load speeds", "Learn basic AWS hosting topologies"]
        )
        session.add(review)

        # 9. Seed Skill Assessments
        logger.info("Seeding skill assessments...")
        assessment = SkillAssessment(
            employee_id=employees[3].id, current_role="Senior Frontend Engineer", target_role="Tech Lead",
            missing_skills=["System Design", "Cloud Infrastructure (AWS)", "Team Leadership"],
            learning_roadmap=[
                {"phase": "Phase 1: Architecture", "milestone": "Complete system design study", "duration": "1 month", "tasks": ["Design microservice mockup"]},
                {"phase": "Phase 2: Leadership", "milestone": "Conduct 2 technical design reviews", "duration": "2 months", "tasks": ["Mentor a junior dev"]}
            ],
            courses=[{"name": "Distributed Systems", "platform": "Coursera", "duration": "6 weeks"}],
            certifications=[{"name": "AWS Certified Cloud Practitioner", "provider": "AWS", "difficulty": "Beginner"}]
        )
        session.add(assessment)

        # 10. Seed Attrition Data
        logger.info("Seeding attrition predictor data...")
        # Add risk profiles for calculations
        attrition_records = [
            # High risk
            AttritionData(
                employee_id=employees[5].id, risk_score=81.2, risk_level="HIGH",
                satisfaction_score=2.0, work_life_balance=2.0, environment_satisfaction=1.0,
                training_times_last_year=0, years_at_company=2, performance_rating=3.2,
                retention_strategy="1. **Conduct Stay Interview**: Resolve immediate job-role frustrations.\n2. **Review Workload**: Adjust delivery timelines to restore work-life balance.\n3. **Salary Review**: Ensure compensation aligns with high delivery goals."
            ),
            # Low risk
            AttritionData(
                employee_id=employees[3].id, risk_score=15.5, risk_level="LOW",
                satisfaction_score=4.5, work_life_balance=4.0, environment_satisfaction=4.0,
                training_times_last_year=2, years_at_company=3, performance_rating=4.0,
                retention_strategy="1. Maintain quarterly career checkpoints.\n2. Provide leadership avenues."
            ),
            # Medium risk
            AttritionData(
                employee_id=employees[4].id, risk_score=48.0, risk_level="MEDIUM",
                satisfaction_score=3.0, work_life_balance=3.0, environment_satisfaction=3.0,
                training_times_last_year=1, years_at_company=1, performance_rating=4.1,
                retention_strategy="1. Arrange upskilling courses.\n2. Outline KPI metrics for the senior engineer path."
            )
        ]
        session.add_all(attrition_records)

        # 11. Seed Notification
        logger.info("Seeding initial notifications...")
        notifications = [
            Notification(user_id=users[4].id, message="Welcome to your AI Talent Intelligence HRMS portal!", notification_type="SUCCESS"),
            Notification(user_id=users[2].id, message="Pending leave request from Galahad Pure requires review.", notification_type="ALERT")
        ]
        session.add_all(notifications)

        await session.commit()
        logger.info("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
