from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import User, Employee, Candidate
from app.schemas.schemas import UserCreate, UserResponse, Token
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALLOWED_ROLES = {"ADMIN", "MANAGEMENT", "SENIOR_MANAGER", "HR_RECRUITER", "EMPLOYEE", "CANDIDATE"}
EMPLOYEE_PROFILE_ROLES = {"MANAGEMENT", "SENIOR_MANAGER", "HR_RECRUITER", "EMPLOYEE"}
DEFAULT_JOB_TITLES = {
    "MANAGEMENT": "Management Executive",
    "SENIOR_MANAGER": "Senior Manager",
    "HR_RECRUITER": "HR Recruiter",
    "EMPLOYEE": "Employee",
}

def _derive_profile_name(email: str, first_name: str | None, last_name: str | None) -> tuple[str, str]:
    local_part = email.split("@", 1)[0].replace(".", " ").replace("_", " ").replace("-", " ")
    name_parts = [part.capitalize() for part in local_part.split() if part]

    derived_first = first_name.strip() if first_name and first_name.strip() else (name_parts[0] if name_parts else "New")
    derived_last = last_name.strip() if last_name and last_name.strip() else (" ".join(name_parts[1:]) if len(name_parts) > 1 else "User")

    return derived_first, derived_last

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    role = user_in.role.upper()
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Select a valid signup role."
        )

    # Check if user already exists
    result = await db.execute(select(User).filter(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system."
        )

    # Hash the password and create the user
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        role=role,
        is_active=True
    )
    db.add(user)
    await db.flush()

    if role in EMPLOYEE_PROFILE_ROLES:
        first_name, last_name = _derive_profile_name(user_in.email, user_in.first_name, user_in.last_name)
        job_title = user_in.job_title.strip() if user_in.job_title and user_in.job_title.strip() else DEFAULT_JOB_TITLES[role]
        db.add(Employee(
            user_id=user.id,
            first_name=first_name,
            last_name=last_name,
            job_title=job_title,
            current_skills=[]
        ))

    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # Authenticate user
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Inactive user account"
        )

    # Resolve corresponding ID for profiles
    user_id = user.id
    employee_id = 0
    candidate_id = 0
    
    if user.role == "EMPLOYEE" or user.role in ["ADMIN", "MANAGEMENT", "SENIOR_MANAGER", "HR_RECRUITER"]:
        emp_result = await db.execute(select(Employee).filter(Employee.user_id == user.id))
        emp = emp_result.scalars().first()
        if emp:
            employee_id = emp.id
            
    if user.role == "CANDIDATE":
        cand_result = await db.execute(select(Candidate).filter(Candidate.user_id == user.id))
        cand = cand_result.scalars().first()
        if cand:
            candidate_id = cand.id

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "user_id": user.id
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
