from datetime import date, datetime, time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.db.session import get_db
from app.db.models import Attendance, Employee, User
from app.schemas.schemas import AttendanceResponse, AttendancePunch
from app.core.security import get_current_user, RoleChecker

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/punch-in", response_model=AttendanceResponse)
async def punch_in(
    punch: AttendancePunch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clocks in the current employee for today."""
    # Find employee
    emp_res = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    emp = emp_res.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found.")
        
    today = date.today()
    # Check if already punched in today
    att_res = await db.execute(
        select(Attendance).filter(
            and_(Attendance.employee_id == emp.id, Attendance.date == today)
        )
    )
    existing = att_res.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Already clocked in for today.")

    now = datetime.now()
    # Status calculation (e.g. late if clock in after 9:30 AM)
    status_str = "PRESENT"
    if now.time() > time(9, 30):
        status_str = "LATE"
        
    attendance = Attendance(
        employee_id=emp.id,
        date=today,
        clock_in=now,
        status=status_str,
        location=punch.location or "Office"
    )
    db.add(attendance)
    await db.commit()
    await db.refresh(attendance)
    return attendance

@router.post("/punch-out", response_model=AttendanceResponse)
async def punch_out(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clocks out the current employee for today."""
    emp_res = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    emp = emp_res.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found.")
        
    today = date.today()
    att_res = await db.execute(
        select(Attendance).filter(
            and_(Attendance.employee_id == emp.id, Attendance.date == today)
        )
    )
    attendance = att_res.scalars().first()
    if not attendance:
        raise HTTPException(status_code=400, detail="You must punch in first before punching out.")
    if attendance.clock_out is not None:
        raise HTTPException(status_code=400, detail="Already punched out today.")
        
    attendance.clock_out = datetime.now()
    await db.commit()
    await db.refresh(attendance)
    return attendance

@router.get("/me", response_model=List[AttendanceResponse])
async def get_my_attendance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gets the attendance history for the logged-in employee."""
    emp_res = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    emp = emp_res.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found.")
        
    res = await db.execute(
        select(Attendance).filter(Attendance.employee_id == emp.id).order_by(Attendance.date.desc())
    )
    return res.scalars().all()

@router.get("/team", response_model=List[AttendanceResponse])
async def get_team_attendance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER"]))
):
    """Gets all team attendance entries recorded today."""
    today = date.today()
    res = await db.execute(
        select(Attendance).filter(Attendance.date == today).order_by(Attendance.clock_in.desc())
    )
    return res.scalars().all()
