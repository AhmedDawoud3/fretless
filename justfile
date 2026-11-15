set windows-shell := ["pwsh", "-NoLogo", "-Command"]

# Everything CI runs.
check: lint typecheck test

install:
    uv sync
    npm --prefix frontend ci

# Backend on :8000 (run `just web` in a second terminal).
api:
    uv run uvicorn fretless.api:app --reload

# Frontend on :5173, proxies /api to the backend.
web:
    npm --prefix frontend run dev

lint:
    uv run ruff format --check .
    uv run ruff check .
    npm --prefix frontend run lint

format:
    uv run ruff format .
    uv run ruff check --fix .
    npm --prefix frontend run format

typecheck:
    uv run ty check
    npm --prefix frontend run typecheck

test:
    uv run pytest
    npm --prefix frontend test

# Regenerate frontend API types from the FastAPI schema. Run after any API change.
gen-api:
    uv run python scripts/export_openapi.py frontend/openapi.json
    npx --yes openapi-typescript@7.13.0 frontend/openapi.json -o frontend/src/api/schema.d.ts

# ub-mode "make it right" tools. Local only, not in CI.
quality:
    crapper --coverage-command "just coverage" --threshold 10
    dryer --threshold 0.8
    mutator

# Write LCOV for both languages; `quality` feeds it to crapper and mutator.
coverage:
    uv run pytest --cov=fretless --cov-report=lcov:coverage.lcov
    npm --prefix frontend run coverage
