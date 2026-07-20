from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey


class RestaurantScopedMixin:
    restaurant_id: Mapped[int] = mapped_column(ForeignKey("restaurants.id"), index=True)

