import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from api.db.client import ping
from api.limiter import limiter
from api.routes import alerts, assets, auth, digest, health, proxy, risk, scan, threats

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("lucius.api")

# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    if ping():
        logger.info("Database connection: OK")
    else:
        logger.warning(
            "Database connection: FAILED — check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        )
    yield

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Lucius SecOps API",
    version="2.4.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

# ── Rate limiting ─────────────────────────────────────────────────────────────

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────

_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
origins = [o.strip() for o in _raw_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "X-API-Key", "Content-Type"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(health.router,  prefix="/api/v1")
app.include_router(auth.router,    prefix="/api/v1")
app.include_router(risk.router,    prefix="/api/v1")
app.include_router(alerts.router,  prefix="/api/v1")
app.include_router(assets.router,  prefix="/api/v1")
app.include_router(scan.router,    prefix="/api/v1")
app.include_router(threats.router, prefix="/api/v1")
app.include_router(digest.router,  prefix="/api/v1")
app.include_router(proxy.router,   prefix="/api/v1")

# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
async def root(request: Request):
    raise HTTPException(status_code=404)
