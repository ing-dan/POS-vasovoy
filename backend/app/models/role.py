from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import RestaurantScopedMixin


class Role(Base, RestaurantScopedMixin):
    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("restaurant_id", "code", name="uq_roles_restaurant_code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    label: Mapped[str] = mapped_column(String(80), nullable=False)

    users = relationship("User", back_populates="role")

