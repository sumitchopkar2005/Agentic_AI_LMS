"""Authentication routes – dev login and token generation."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.models.institution import Institution

router = APIRouter()


class LoginRequest(BaseModel):
    email: str


class RegisterRequest(BaseModel):
    email: str
    full_name: str
    role: str = "faculty"


class AuthResponse(BaseModel):
    token: str
    user_id: str
    role: str
    full_name: str


async def _create_token(user: User, db: AsyncSession) -> str:
    from app.models.course import Course

    now = datetime.now(timezone.utc)

    # Fetch actual course IDs for this user
    if user.role == UserRole.FACULTY:
        result = await db.execute(
            select(Course.id).where(Course.faculty_id == user.id)
        )
    else:
        # Students see all courses in their institution
        result = await db.execute(
            select(Course.id).where(Course.institution_id == user.institution_id)
        )
    course_ids = [str(row[0]) for row in result.all()]

    payload = {
        "sub": str(user.id),
        "role": user.role.value if isinstance(user.role, UserRole) else user.role,
        "institution_id": str(user.institution_id),
        "course_ids": course_ids,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expiration_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    """Log in by email. Creates institution + user on first login (dev mode)."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        # Auto-create in dev mode
        if not settings.debug:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Get-or-create default institution
        inst_result = await db.execute(select(Institution).limit(1))
        institution = inst_result.scalar_one_or_none()
        if not institution:
            institution = Institution(name="Default University", data_residency="US_EAST")
            db.add(institution)
            await db.flush()

        # Infer role from email for dev convenience
        auto_role = UserRole.STUDENT if "student" in body.email.lower() else UserRole.FACULTY
        user = User(
            institution_id=institution.id,
            email=body.email,
            full_name=body.email.split("@")[0].replace(".", " ").title(),
            role=auto_role,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = await _create_token(user, db)
    return AuthResponse(
        token=token,
        user_id=str(user.id),
        role=user.role.value if isinstance(user.role, UserRole) else user.role,
        full_name=user.full_name,
    )


@router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    """Register a new user (dev mode)."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Validate role
    try:
        role = UserRole(body.role.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}",
        )

    # Get-or-create default institution
    inst_result = await db.execute(select(Institution).limit(1))
    institution = inst_result.scalar_one_or_none()
    if not institution:
        institution = Institution(name="Default University", data_residency="US_EAST")
        db.add(institution)
        await db.flush()

    user = User(
        institution_id=institution.id,
        email=body.email,
        full_name=body.full_name,
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = await _create_token(user, db)
    return AuthResponse(
        token=token,
        user_id=str(user.id),
        role=user.role.value if isinstance(user.role, UserRole) else user.role,
        full_name=user.full_name,
    )
