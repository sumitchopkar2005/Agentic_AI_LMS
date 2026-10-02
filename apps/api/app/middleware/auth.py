"""JWT authentication middleware."""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class AuthMiddleware(BaseHTTPMiddleware):
    """Optional middleware for global auth enforcement.

    Note: Most auth is handled via FastAPI Depends() in routes.
    This middleware is for additional checks like IP allowlisting
    or institutional tenant isolation.
    """

    EXEMPT_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)
        return await call_next(request)
