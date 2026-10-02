"""Custom exception hierarchy for the Agentic LMS."""


class AppError(Exception):
    """Base application error with structured error code."""

    def __init__(
        self, code: str, message: str, status: int = 400, details: dict | None = None
    ):
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            code=f"{resource.upper()}_NOT_FOUND",
            message=f"{resource} with ID {resource_id} not found.",
            status=404,
        )


class InsufficientGoldError(AppError):
    def __init__(self, required: int, balance: int):
        super().__init__(
            code="INSUFFICIENT_GOLD",
            message=f"You need {required} Gold but only have {balance}.",
            status=402,
            details={"required": required, "balance": balance},
        )


class ForbiddenError(AppError):
    def __init__(self, message: str = "You do not have permission for this action."):
        super().__init__(code="FORBIDDEN", message=message, status=403)


class IngestionError(AppError):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(code="INGESTION_ERROR", message=message, status=500, details=details)


class GradingError(AppError):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(code="GRADING_ERROR", message=message, status=500, details=details)


class SandboxError(AppError):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(code="SANDBOX_ERROR", message=message, status=500, details=details)
