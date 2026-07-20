from sqlalchemy import select
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import DbSession, get_current_user, require_roles
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import RoleOut
from app.schemas.users import UserAdminOut, UserCreate, UserListOut, UserUpdate, UserUpsertOut
from app.services.security import hash_password


router = APIRouter(prefix="/users", tags=["users"])


def _role_to_out(role: Role) -> RoleOut:
    return RoleOut(id=role.id, code=role.code, label=role.label)


def _user_to_out(user: User) -> UserAdminOut:
    return UserAdminOut(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        restaurant_id=user.restaurant_id,
        is_active=user.is_active,
        role=_role_to_out(user.role),
    )


def _get_role_or_404(db: DbSession, restaurant_id: int, role_id: int) -> Role:
    role = db.scalar(
        select(Role).where(
            Role.id == role_id,
            Role.restaurant_id == restaurant_id,
        )
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    return role


@router.get("", response_model=UserListOut)
def list_users(
    db: DbSession,
    current_user: User = Depends(require_roles("admin")),
) -> UserListOut:
    users = db.scalars(
        select(User)
        .where(User.restaurant_id == current_user.restaurant_id)
        .order_by(User.username)
    ).all()
    for user in users:
        _ = user.role
    return UserListOut(items=[_user_to_out(user) for user in users])


@router.post("", response_model=UserUpsertOut)
def create_user(
    payload: UserCreate,
    db: DbSession,
    current_user: User = Depends(require_roles("admin")),
) -> UserUpsertOut:
    existing = db.scalar(
        select(User).where(
            User.restaurant_id == current_user.restaurant_id,
            User.username == payload.username.strip(),
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese nombre")

    role = _get_role_or_404(db, current_user.restaurant_id, payload.role_id)
    user = User(
        restaurant_id=current_user.restaurant_id,
        role_id=role.id,
        username=payload.username.strip(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _ = user.role
    return UserUpsertOut(item=_user_to_out(user))


@router.put("/{user_id}", response_model=UserUpsertOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: DbSession,
    current_user: User = Depends(require_roles("admin")),
) -> UserUpsertOut:
    user = db.scalar(
        select(User).where(
            User.id == user_id,
            User.restaurant_id == current_user.restaurant_id,
        )
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    existing = db.scalar(
        select(User).where(
            User.restaurant_id == current_user.restaurant_id,
            User.username == payload.username.strip(),
            User.id != user.id,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese nombre")

    role = _get_role_or_404(db, current_user.restaurant_id, payload.role_id)
    user.username = payload.username.strip()
    user.full_name = payload.full_name.strip()
    user.role_id = role.id
    user.is_active = payload.is_active
    if payload.password:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    _ = user.role
    return UserUpsertOut(item=_user_to_out(user))
