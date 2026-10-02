from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

security = HTTPBearer()


class CurrentUser:
    def __init__(self, id: UUID, role: str, institution_id: UUID, course_ids: list[UUID]):
        self.id = id
        self.role = role
        self.institution_id = institution_id
        self.course_ids = course_ids


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return CurrentUser(
            id=UUID(payload["sub"]),
            role=payload["role"],
            institution_id=UUID(payload["institution_id"]),
            course_ids=[UUID(c) for c in payload.get("course_ids", [])],
        )
    except (JWTError, KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        ) from e


async def get_current_faculty(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in ("faculty", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faculty role required")
    return user


async def get_current_student(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student role required")
    return user
