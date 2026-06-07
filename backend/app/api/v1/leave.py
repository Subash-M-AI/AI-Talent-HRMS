from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.db.session import get_db
from app.db.models import LeaveRequest, Employee, User, Notification
from app.schemas.schemas import LeaveRequestResponse, LeaveRequestCreate, LeaveRequestUpdate
from app.core.security import get_current_user, RoleChecker

router = APIRouter(prefix="/leaves", tags=["Leaves"])

@router.post("/", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
async def request_leave(
    leave_in: LeaveRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submits a new leave request."""
    emp_res = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    emp = emp_res.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found.")
        
    leave = LeaveRequest(
        employee_id=emp.id,
        leave_type=leave_in.leave_type.upper(),
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        reason=leave_in.reason,
        status="PENDING"
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return leave

@router.get("/me", response_model=List[LeaveRequestResponse])
async def get_my_leaves(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all leaves requested by the logged-in employee."""
    emp_res = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    emp = emp_res.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found.")
        
    res = await db.execute(
        select(LeaveRequest).filter(LeaveRequest.employee_id == emp.id).order_by(LeaveRequest.created_at.desc())
    )
    return res.scalars().all()

@router.get("/pending", response_model=List[LeaveRequestResponse])
async def get_pending_leaves(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER"]))
):
    """Lists all pending leave requests for manager approval."""
    res = await db.execute(
        select(LeaveRequest).filter(LeaveRequest.status == "PENDING").order_by(LeaveRequest.created_at.asc())
    )
    return res.scalars().all()

@router.patch("/{id}", response_model=LeaveRequestResponse)
async def update_leave_status(
    id: int,
    leave_update: LeaveRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "MANAGEMENT", "SENIOR_MANAGER"]))
):
    """Approves or Rejects a pending leave request."""
    # Find manager employee id
    mgr_res = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    mgr = mgr_res.scalars().first()
    mgr_id = mgr.id if mgr else None

    res = await db.execute(select(LeaveRequest).filter(LeaveRequest.id == id))
    leave = res.scalars().first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")
    if leave.status != "PENDING":
        raise HTTPException(status_code=400, detail="Leave request has already been processed.")
        
    requested_status = leave_update.status.upper()
    if requested_status in {"DECLINE", "DECLINED"}:
        requested_status = "REJECTED"
    if requested_status not in {"APPROVED", "REJECTED"}:
        raise HTTPException(status_code=400, detail="Leave status must be APPROVED or REJECTED.")

    leave.status = requested_status
    leave.approved_by = mgr_id
    
    # Notify employee (create Notification entry)
    emp_res = await db.execute(select(Employee).filter(Employee.id == leave.employee_id))
    emp = emp_res.scalars().first()
    if emp:
        decision_label = "approved" if leave.status == "APPROVED" else "declined"
        notif = Notification(
            user_id=emp.user_id,
            message=f"Your {leave.leave_type.lower()} leave request for {leave.start_date} to {leave.end_date} has been {decision_label}.",
            notification_type="ALERT" if leave.status == "REJECTED" else "SUCCESS"
        )
        db.add(notif)
        
    await db.commit()
    await db.refresh(leave)
    return leave
