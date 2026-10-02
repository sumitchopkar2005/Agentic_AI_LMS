.PHONY: dev check lint test migrate seed reset infra infra-down

# ─── Development ─────────────────────────────────────────────
dev:
	@echo "Starting all services..."
	turbo run dev

dev-api:
	cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-web:
	cd apps/web && npm run dev

# ─── Quality ─────────────────────────────────────────────────
check: lint test
	@echo "✓ All checks passed"

lint:
	cd apps/api && ruff check . && ruff format --check . && mypy .
	cd apps/web && npm run lint

test:
	cd apps/api && pytest
	cd apps/web && npm run test

# ─── Database ────────────────────────────────────────────────
migrate:
	cd apps/api && alembic upgrade head

migrate-new:
	cd apps/api && alembic revision --autogenerate -m "$(msg)"

seed:
	cd apps/api && python scripts/seed_dev_data.py

reset:
	bash scripts/reset_local.sh

# ─── Infrastructure ──────────────────────────────────────────
infra:
	docker compose up -d

infra-down:
	docker compose down

infra-vllm:
	docker compose -f docker-compose.vllm.yml up -d
