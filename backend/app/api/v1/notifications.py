from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import Notification, User
from app.schemas.schemas import NotificationResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/me", response_model=List[NotificationResponse])
async def get_my_notifications(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists recent notifications for the logged-in user."""
    safe_limit = min(max(limit, 1), 100)
    res = await db.execute(
        select(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(safe_limit)
    )
    return res.scalars().all()

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks one notification as read for the logged-in user."""
    res = await db.execute(
        select(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
    )
    notification = res.scalars().first()
    if not notification:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification not found.")

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification
