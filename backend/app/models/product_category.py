from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import RestaurantScopedMixin


class ProductCategory(Base, RestaurantScopedMixin):
    __tablename__ = "product_categories"
    __table_args__ = (UniqueConstraint("restaurant_id", "name", name="uq_product_categories_restaurant_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False)

    products = relationship("Product", back_populates="category")
