from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RestaurantSettings(Base):
    __tablename__ = "restaurant_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    restaurant_id: Mapped[int] = mapped_column(ForeignKey("restaurants.id"), unique=True, nullable=False, index=True)
    business_name: Mapped[str] = mapped_column(String(120), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="MXN", nullable=False)
    tax_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    receipt_footer: Mapped[str | None] = mapped_column(Text, nullable=True)
    table_label_singular: Mapped[str] = mapped_column(String(40), default="Mesa", nullable=False)
    table_label_plural: Mapped[str] = mapped_column(String(40), default="Mesas", nullable=False)

    restaurant = relationship("Restaurant", back_populates="settings")

