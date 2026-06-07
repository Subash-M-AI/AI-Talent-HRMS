from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import Employee, Department, JobPost, Candidate, Application, User, AttritionData
from app.schemas.schemas import CopilotRequest, CopilotResponse
from app.core.security import get_current_user, RoleChecker
from app.ai.analytics_copilot import ask_copilot

router = APIRouter(prefix="/copilot", tags=["HR Analytics Copilot"])

async def compile_company_context(db: AsyncSession) -> dict:
    """Helper function to aggregate state statistics for the Copilot AI prompt context."""
    total_emp = (await db.execute(select(func.count(Employee.id)))).scalar() or 0
    active_emp = (await db.execute(select(func.count(Employee.id)))).scalar() or 0
    open_jobs = (await db.execute(select(func.count(JobPost.id)).filter(JobPost.status == "OPEN"))).scalar() or 0

    dept_res = await db.execute(
        select(
            Department.id,
            Department.name,
            func.count(Employee.id).label("employee_count"),
            func.avg(Employee.performance_rating).label("average_perf"),
            func.avg(AttritionData.risk_score).label("attrition_rate"),
        )
        .outerjoin(Employee, Employee.department_id == Department.id)
        .outerjoin(AttritionData, AttritionData.employee_id == Employee.id)
        .group_by(Department.id, Department.name)
        .order_by(Department.name)
    )
    dept_list = [
        {
            "name": row.name,
            "employee_count": int(row.employee_count or 0),
            "attrition_rate": round(float(row.attrition_rate or 10.0), 1),
            "average_perf": round(float(row.average_perf or 0.0), 1),
        }
        for row in dept_res.all()
    ]

    cand_res = await db.execute(
        select(Application)
        .filter(Application.match_percentage >= 70.0)
        .options(selectinload(Application.candidate), selectinload(Application.job_post))
        .order_by(Application.match_percentage.desc())
        .limit(5)
    )
    apps = cand_res.scalars().all()
    cand_list = []
    for app in apps:
        if app.candidate and app.job_post:
            cand_list.append({
                "name": f"{app.candidate.first_name} {app.candidate.last_name}",
                "job": app.job_post.title,
                "match_pct": app.match_percentage
            })

    high_emp_res = await db.execute(
        select(Employee)
        .filter(Employee.performance_rating >= 4.5)
        .order_by(Employee.performance_rating.desc())
        .limit(5)
    )
    high_emps = high_emp_res.scalars().all()
    perf_list = []
    for emp in high_emps:
        perf_list.append({
            "name": f"{emp.first_name} {emp.last_name}",
            "role": emp.job_title,
            "rating": emp.performance_rating,
            "years": 2  # simulated
        })

    return {
        "total_employees": total_emp,
        "active_employees": active_emp,
        "open_jobs": open_jobs,
        "departments": dept_list,
        "top_candidates": cand_list,
        "high_performers": perf_list
    }

@router.post("/", response_model=CopilotResponse)
async def query_hr_copilot(
    payload: CopilotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER", "HR_RECRUITER", "EMPLOYEE", "CANDIDATE"]))
):
    """Executes a chat session with the Analytics Copilot using live organizational metrics."""
    if current_user.role in {"EMPLOYEE", "CANDIDATE"}:
        company_context = {
            "total_employees": 0,
            "active_employees": 0,
            "open_jobs": 0,
            "departments": [],
            "top_candidates": [],
            "high_performers": [],
            "requester_role": current_user.role,
        }
    else:
        company_context = await compile_company_context(db)
        company_context["requester_role"] = current_user.role
    
    response_text = await ask_copilot(payload.query, company_context)
    return {"response": response_text}
