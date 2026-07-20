from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleOut(BaseModel):
    id: int
    code: str
    label: str


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    restaurant_id: int
    role: RoleOut


class LoginResponse(TokenResponse):
    user: UserOut

