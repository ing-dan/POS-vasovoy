from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)
    note: str | None = None


class OrderCreate(BaseModel):
    table_label: str = Field(min_length=1, max_length=40)
    note: str | None = None
    items: list[OrderItemCreate]


class OrderDeltaItemCreate(BaseModel):
    product_id: int
    quantity_delta: int = Field(default=1)
    note: str | None = None


class OrderDeltaCreate(BaseModel):
    note: str | None = None
    items: list[OrderDeltaItemCreate]


class OrderStatusUpdate(BaseModel):
    status: Literal["sent", "preparing", "ready"]


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    line_total: float
    note: str | None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_id: int
    created_by_user_id: int
    table_label: str
    status: str
    note: str | None
    total_amount: float
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut]


class OrderListOut(BaseModel):
    items: list[OrderOut]


class OrderDeltaItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity_delta: int
    unit_price: float
    line_total: float
    note: str | None


class OrderDeltaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_id: int
    order_id: int
    created_by_user_id: int
    order_table_label: str
    order_status: str
    status: str
    note: str | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderDeltaItemOut]


class OrderDeltaListOut(BaseModel):
    items: list[OrderDeltaOut]
