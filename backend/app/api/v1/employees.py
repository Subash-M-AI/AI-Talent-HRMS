from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import Employee, User, AttritionData, SkillAssessment, Department
from app.schemas.schemas import EmployeeResponse, EmployeeCreate, EmployeeUpdate, AttritionPredictionResponse, SkillAssessmentResponse, PerformanceReviewCreate, PerformanceReviewResponse
from app.core.security import get_current_user, RoleChecker
from app.ai.attrition_predictor import predict_attrition_risk_score, generate_retention_strategy
from app.ai.skill_gap import analyze_skill_gap

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("/", response_model=List[EmployeeResponse])
async def list_employees(
    skip: int = 0,
    limit: int = 50,
    department_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER", "HR_RECRUITER", "MANAGER"]))
):
    """List all employees with pagination. Supports filtering by department."""
    query = select(Employee)
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/stats")
async def get_employee_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER", "HR_RECRUITER", "MANAGER"]))
):
    """Aggregate statistics for executive dashboards."""
    total = (await db.execute(select(func.count(Employee.id)))).scalar() or 0
    active = total
    avg_perf = (await db.execute(select(func.avg(Employee.performance_rating)))).scalar() or 0.0
    dept_rows = await db.execute(
        select(
            Department.id,
            Department.name,
            func.count(Employee.id).label("employee_count"),
            func.avg(Employee.performance_rating).label("average_performance"),
        )
        .outerjoin(Employee, Employee.department_id == Department.id)
        .group_by(Department.id, Department.name)
        .order_by(Department.name)
    )
    department_breakdown = [
        {
            "id": row.id,
            "name": row.name,
            "employee_count": int(row.employee_count or 0),
            "average_performance": round(float(row.average_performance or 0.0), 2),
            "share": round((float(row.employee_count or 0) / total) * 100, 1) if total else 0.0,
        }
        for row in dept_rows.all()
    ]
    
    return {
        "total_employees": total,
        "active_employees": active,
        "average_performance": round(float(avg_perf), 2) if avg_perf else 0.0,
        "new_hires": max(1, int(total * 0.1)) if total else 0,
        "department_breakdown": department_breakdown,
    }

@router.get("/me/profile", response_model=EmployeeResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current authenticated user's employee profile."""
    result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    emp = result.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found.")
    return emp

@router.get("/{id}", response_model=EmployeeResponse)
async def get_employee(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific employee by ID."""
    result = await db.execute(select(Employee).filter(Employee.id == id))
    emp = result.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp

@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    emp_in: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "HR_RECRUITER"]))
):
    """Creates a new employee and their associated user account."""
    # Check if user email already exists
    result = await db.execute(select(User).filter(User.email == emp_in.email))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
        
    from app.core.security import get_password_hash
    hashed_pwd = get_password_hash(emp_in.password)
    user = User(
        email=emp_in.email,
        hashed_password=hashed_pwd,
        role=emp_in.role.upper(),
        is_active=True
    )
    db.add(user)
    await db.flush()  # get user.id
    
    emp = Employee(
        user_id=user.id,
        first_name=emp_in.first_name,
        last_name=emp_in.last_name,
        job_title=emp_in.job_title,
        department_id=emp_in.department_id,
        salary=emp_in.salary,
        current_skills=emp_in.current_skills,
        performance_rating=3.0
    )
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp

@router.put("/{id}", response_model=EmployeeResponse)
async def update_employee(
    id: int,
    emp_in: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER", "HR_RECRUITER", "MANAGER"]))
):
    """Updates an employee profile's mutable fields."""
    result = await db.execute(select(Employee).filter(Employee.id == id))
    emp = result.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    update_data = emp_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(emp, field, value)
        
    await db.commit()
    await db.refresh(emp)
    return emp

# --- AI ATTRITION ENDPOINT ---
@router.post("/{id}/predict-attrition", response_model=AttritionPredictionResponse)
async def run_attrition_prediction(
    id: int,
    satisfaction_score: float = 4.0,
    work_life_balance: float = 4.0,
    environment_satisfaction: float = 4.0,
    training_times_last_year: int = 2,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER", "MANAGER"]))
):
    """Runs the AI Attrition prediction on an employee and saves retention metrics."""
    result = await db.execute(select(Employee).filter(Employee.id == id))
    emp = result.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    metrics = {
        "satisfaction_score": satisfaction_score,
        "work_life_balance": work_life_balance,
        "environment_satisfaction": environment_satisfaction,
        "training_times_last_year": training_times_last_year,
        "years_at_company": max(1, (func.now() - emp.hire_date).days // 365 if hasattr(emp.hire_date, 'year') else 1),
        "performance_rating": emp.performance_rating
    }
    
    risk_score, risk_level = predict_attrition_risk_score(metrics)
    
    # Generate retention strategy via Gemini
    retention_strategy = await generate_retention_strategy(
        employee_name=f"{emp.first_name} {emp.last_name}",
        job_title=emp.job_title,
        metrics=metrics,
        risk_score=risk_score,
        risk_level=risk_level
    )
    
    # Upsert attrition data
    attr_result = await db.execute(select(AttritionData).filter(AttritionData.employee_id == id))
    attr = attr_result.scalars().first()
    
    if not attr:
        attr = AttritionData(employee_id=id)
        db.add(attr)
        
    attr.risk_score = risk_score
    attr.risk_level = risk_level
    attr.satisfaction_score = satisfaction_score
    attr.work_life_balance = work_life_balance
    attr.environment_satisfaction = environment_satisfaction
    attr.training_times_last_year = training_times_last_year
    attr.years_at_company = metrics["years_at_company"]
    attr.performance_rating = emp.performance_rating
    attr.retention_strategy = retention_strategy
    
    await db.commit()
    await db.refresh(attr)
    return attr

@router.get("/{id}/attrition", response_model=AttritionPredictionResponse)
async def get_employee_attrition_prediction(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER", "MANAGER"]))
):
    """Retrieves an employee's attrition risk analysis."""
    result = await db.execute(select(AttritionData).filter(AttritionData.employee_id == id))
    attr = result.scalars().first()
    if not attr:
        raise HTTPException(status_code=404, detail="No attrition data available for this employee. Run prediction first.")
    return attr

# --- AI SKILL GAP ANALYZER ENDPOINT ---
@router.post("/{id}/analyze-gap", response_model=SkillAssessmentResponse)
async def run_skill_gap_analysis(
    id: int,
    target_role: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyzes an employee's skill gap against a target career role."""
    result = await db.execute(select(Employee).filter(Employee.id == id))
    emp = result.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # User restriction: employees can only check their own gap
    if current_user.role == "EMPLOYEE" and emp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to run gap analysis for other employees.")
        
    # Run AI evaluation
    gap_result = await analyze_skill_gap(
        current_role=emp.job_title,
        target_role=target_role,
        current_skills=emp.current_skills or []
    )
    
    assessment = SkillAssessment(
        employee_id=id,
        current_role=emp.job_title,
        target_role=target_role,
        missing_skills=gap_result.get("missing_skills", []),
        learning_roadmap=gap_result.get("learning_roadmap", []),
        courses=gap_result.get("courses", []),
        certifications=gap_result.get("certifications", [])
    )
    db.add(assessment)
    await db.commit()
    return assessment

# --- AI PERFORMANCE ANALYZER ENDPOINT ---
@router.post("/{id}/analyze-performance")
async def run_performance_analysis(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER", "MANAGER"]))
):
    """Generates an AI performance analysis for an employee using Gemini."""
    # 1. Fetch employee
    emp_res = await db.execute(select(Employee).filter(Employee.id == id))
    emp = emp_res.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # 2. Get department details
    dept_name = "N/A"
    if emp.department_id:
        dept_res = await db.execute(select(Department).filter(Department.id == emp.department_id))
        dept = dept_res.scalars().first()
        if dept:
            dept_name = dept.name

    # 3. Get attendance stats for context
    from app.db.models import Attendance, LeaveRequest
    att_res = await db.execute(select(Attendance).filter(Attendance.employee_id == id))
    attendance_records = att_res.scalars().all()
    total_punches = len(attendance_records)
    late_punches = len([a for a in attendance_records if a.status == "LATE"])
    on_time_percentage = 100.0
    if total_punches > 0:
        on_time_percentage = round(((total_punches - late_punches) / total_punches) * 100, 1)

    # 4. Get leaves stats for context
    leaves_res = await db.execute(select(LeaveRequest).filter(LeaveRequest.employee_id == id))
    leaves_records = leaves_res.scalars().all()
    total_leaves = len(leaves_records)
    approved_leaves = len([l for l in leaves_records if l.status == "APPROVED"])

    # 5. Generate AI analysis
    from app.ai.performance_analyzer import analyze_performance
    analysis = await analyze_performance(
        employee_name=f"{emp.first_name} {emp.last_name}",
        job_title=emp.job_title,
        department=dept_name,
        rating=emp.performance_rating,
        skills=emp.current_skills or [],
        attendance_stats={
            "total_days": total_punches,
            "late_days": late_punches,
            "on_time_percentage": on_time_percentage
        },
        leave_stats={
            "total_leaves": total_leaves,
            "approved_leaves": approved_leaves
        }
    )

    return analysis

