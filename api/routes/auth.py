import os
from datetime import datetime, timedelta, timezone

import bleach
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from api.db.client import db
from api.main import limiter
from api.models.schemas import LoginRequest, Response, TokenResponse

router = APIRouter(tags=["auth"])

# auto_error=False so we can return HTTP 401 instead of FastAPI's default 403
security = HTTPBearer(auto_error=False)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_SECRET: str = os.environ["JWT_SECRET_KEY"]
_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
_EXPIRY_MINUTES: int = int(os.getenv("JWT_EXPIRY_MINUTES", "480"))


def get_current_org_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """
    Reusable FastAPI dependency. Validates the Bearer JWT and returns the org_id
    embedded in the payload. Import and use with Depends() in any protected route.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, _SECRET, algorithms=[_ALGORITHM])
        org_id: str | None = payload.get("org_id")
        if not org_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return org_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest):
    # bleach on email only — never apply to password before bcrypt verify
    email = bleach.clean(body.email.strip().lower())

    try:
        result = (
            db.table("users")
            .select("id, org_id, password_hash")
            .eq("email", email)
            .single()
            .execute()
        )
        user = result.data
    except Exception:
        # Catch missing row (PostgREST PGRST116) and any DB error — never reveal which
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user or not pwd_context.verify(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    expires = datetime.now(timezone.utc) + timedelta(minutes=_EXPIRY_MINUTES)
    token = jwt.encode(
        {"org_id": user["org_id"], "sub": user["id"], "exp": expires},
        _SECRET,
        algorithm=_ALGORITHM,
    )

    return Response(
        success=True,
        data=TokenResponse(access_token=token),
        error=None,
    )


@router.post("/auth/logout")
async def logout(
    request: Request,
    org_id: str = Depends(get_current_org_id),
):
    # JWT is stateless — token remains valid until expiry on the client side.
    # Acknowledge the logout; client must discard the token locally.
    return Response(success=True, data={"message": "Logged out"}, error=None)
