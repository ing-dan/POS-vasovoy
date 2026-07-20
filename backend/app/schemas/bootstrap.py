from pydantic import BaseModel


class BootstrapResult(BaseModel):
    restaurant_id: int
    admin_user_id: int
    created: bool

