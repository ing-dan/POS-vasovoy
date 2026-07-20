from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.dependencies import DbSession, get_current_user, require_roles
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, RoleOut, UserOut
from app.services.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        restaurant_id=user.restaurant_id,
        role=RoleOut(id=user.role.id, code=user.role.code, label=user.role.label),
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: DbSession) -> LoginResponse:
    user = db.scalar(select(User).where(User.username == payload.username))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    token = create_access_token(subject=str(user.id), restaurant_id=user.restaurant_id, role_code=user.role.code)
    return LoginResponse(access_token=token, user=_user_to_out(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return _user_to_out(current_user)


@router.get("/roles", response_model=list[RoleOut])
def list_roles(db: DbSession, current_user: User = Depends(require_roles("admin"))) -> list[RoleOut]:
    roles = db.scalars(select(Role).where(Role.restaurant_id == current_user.restaurant_id).order_by(Role.code)).all()
    return [RoleOut(id=role.id, code=role.code, label=role.label) for role in roles]
