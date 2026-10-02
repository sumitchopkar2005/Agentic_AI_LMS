"""Cursor-based pagination utilities."""

from uuid import UUID

from pydantic import BaseModel


class PaginationParams(BaseModel):
    cursor: str | None = None
    limit: int = 20


class PaginationMeta(BaseModel):
    cursor: str | None
    has_more: bool
    total: int | None = None
