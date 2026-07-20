from pydantic import BaseModel, Field

from app.schemas.auth import RoleOut


class UserAdminOut(BaseModel):
    id: int
    username: str
    full_name: str
    restaurant_id: int
    is_active: bool
    role: RoleOut


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=6, max_length=128)
    role_id: int
    is_active: bool = True


class UserUpdate(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    full_name: str = Field(min_length=1, max_length=120)
    role_id: int
    is_active: bool = True
    password: str | None = Field(default=None, min_length=6, max_length=128)


class UserListOut(BaseModel):
    items: list[UserAdminOut]


class UserUpsertOut(BaseModel):
    item: UserAdminOut
