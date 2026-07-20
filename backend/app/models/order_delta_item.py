from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OrderDeltaItem(Base):
    __tablename__ = "order_delta_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    delta_id: Mapped[int] = mapped_column(ForeignKey("order_deltas.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(String(140), nullable=False)
    quantity_delta: Mapped[int] = mapped_column(nullable=False)
    unit_price: Mapped[float] = mapped_column(nullable=False)
    line_total: Mapped[float] = mapped_column(nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    delta = relationship("OrderDelta", back_populates="items")
    product = relationship("Product")
