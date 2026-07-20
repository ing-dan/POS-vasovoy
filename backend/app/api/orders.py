from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import DbSession, get_current_user, require_roles
from app.models.order import Order
from app.models.order_delta import OrderDelta
from app.models.order_delta_item import OrderDeltaItem
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.orders import (
    OrderCreate,
    OrderDeltaCreate,
    OrderDeltaItemOut,
    OrderDeltaListOut,
    OrderDeltaOut,
    OrderListOut,
    OrderOut,
    OrderStatusUpdate,
)


router = APIRouter(prefix="/orders", tags=["orders"])

ORDER_STATUS_FLOW = {
    "sent": {"preparing", "ready"},
    "preparing": {"ready"},
    "ready": set(),
}


def _order_to_out(order: Order) -> OrderOut:
    return OrderOut.model_validate(order)


def _delta_to_out(delta: OrderDelta) -> OrderDeltaOut:
    return OrderDeltaOut(
        id=delta.id,
        restaurant_id=delta.restaurant_id,
        order_id=delta.order_id,
        created_by_user_id=delta.created_by_user_id,
        order_table_label=delta.order.table_label,
        order_status=delta.order.status,
        status=delta.status,
        note=delta.note,
        created_at=delta.created_at,
        updated_at=delta.updated_at,
        items=[
            OrderDeltaItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity_delta=item.quantity_delta,
                unit_price=item.unit_price,
                line_total=item.line_total,
                note=item.note,
            )
            for item in delta.items
        ],
    )


@router.get("", response_model=OrderListOut)
def list_orders(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    status_filter: str | None = Query(default=None, alias="status"),
) -> OrderListOut:
    statement = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.restaurant_id == current_user.restaurant_id)
    )
    if status_filter:
        statuses = [status.strip() for status in status_filter.split(",") if status.strip()]
        if statuses:
            statement = statement.where(Order.status.in_(statuses))

    orders = db.scalars(statement.order_by(Order.created_at.desc()).limit(20)).all()
    return OrderListOut(items=[_order_to_out(order) for order in orders])


@router.post("", response_model=OrderOut)
def create_order(
    payload: OrderCreate,
    db: DbSession,
    current_user: User = Depends(require_roles("admin", "waiter")),
) -> OrderOut:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El pedido debe tener productos")

    product_ids = [item.product_id for item in payload.items]
    products = db.scalars(
        select(Product).where(
            Product.restaurant_id == current_user.restaurant_id,
            Product.id.in_(product_ids),
        )
    ).all()
    products_by_id = {product.id: product for product in products}

    missing_ids = [product_id for product_id in product_ids if product_id not in products_by_id]
    if missing_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Productos no encontrados: {missing_ids}")

    order = Order(
        restaurant_id=current_user.restaurant_id,
        created_by_user_id=current_user.id,
        table_label=payload.table_label.strip(),
        note=payload.note.strip() if payload.note else None,
        status="sent",
        total_amount=0.0,
    )
    db.add(order)
    db.flush()

    total_amount = 0.0
    for item in payload.items:
        product = products_by_id[item.product_id]
        unit_price = float(product.price)
        line_total = unit_price * item.quantity
        total_amount += line_total
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                quantity=item.quantity,
                unit_price=unit_price,
                line_total=line_total,
                note=item.note.strip() if item.note else None,
            )
        )

    order.total_amount = total_amount
    db.commit()

    fresh_order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    if fresh_order is None:  # pragma: no cover - safety net after commit
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo cargar el pedido")
    return _order_to_out(fresh_order)


@router.get("/deltas", response_model=OrderDeltaListOut)
def list_order_deltas(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    status_filter: str | None = Query(default=None, alias="status"),
) -> OrderDeltaListOut:
    statement = (
        select(OrderDelta)
        .options(selectinload(OrderDelta.items), selectinload(OrderDelta.order))
        .where(OrderDelta.restaurant_id == current_user.restaurant_id)
    )
    if status_filter:
        statuses = [status.strip() for status in status_filter.split(",") if status.strip()]
        if statuses:
            statement = statement.where(OrderDelta.status.in_(statuses))

    deltas = db.scalars(statement.order_by(OrderDelta.created_at.desc()).limit(20)).all()
    return OrderDeltaListOut(items=[_delta_to_out(delta) for delta in deltas])


@router.post("/{order_id}/deltas", response_model=OrderDeltaOut)
def create_order_delta(
    order_id: int,
    payload: OrderDeltaCreate,
    db: DbSession,
    current_user: User = Depends(require_roles("admin", "waiter")),
) -> OrderDeltaOut:
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.id == order_id,
            Order.restaurant_id == current_user.restaurant_id,
        )
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La correccion debe tener productos")
    if any(item.quantity_delta == 0 for item in payload.items):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad delta no puede ser cero")

    product_ids = [item.product_id for item in payload.items]
    products = db.scalars(
        select(Product).where(
            Product.restaurant_id == current_user.restaurant_id,
            Product.id.in_(product_ids),
        )
    ).all()
    products_by_id = {product.id: product for product in products}

    missing_ids = [product_id for product_id in product_ids if product_id not in products_by_id]
    if missing_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Productos no encontrados: {missing_ids}")

    delta = OrderDelta(
        restaurant_id=current_user.restaurant_id,
        order_id=order.id,
        created_by_user_id=current_user.id,
        status="sent",
        note=payload.note.strip() if payload.note else None,
    )
    db.add(delta)
    db.flush()

    for item in payload.items:
        product = products_by_id[item.product_id]
        unit_price = float(product.price)
        line_total = unit_price * item.quantity_delta
        db.add(
            OrderDeltaItem(
                delta_id=delta.id,
                product_id=product.id,
                product_name=product.name,
                quantity_delta=item.quantity_delta,
                unit_price=unit_price,
                line_total=line_total,
                note=item.note.strip() if item.note else None,
            )
        )

    db.commit()

    fresh_delta = db.scalar(
        select(OrderDelta)
        .options(selectinload(OrderDelta.items), selectinload(OrderDelta.order))
        .where(OrderDelta.id == delta.id)
    )
    if fresh_delta is None:  # pragma: no cover - safety net after commit
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo cargar la correccion")
    return _delta_to_out(fresh_delta)


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: DbSession,
    current_user: User = Depends(require_roles("admin", "kitchen")),
) -> OrderOut:
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.id == order_id,
            Order.restaurant_id == current_user.restaurant_id,
        )
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")

    if current_user.role.code != "admin":
        allowed_next = ORDER_STATUS_FLOW.get(order.status, set())
        if payload.status not in allowed_next:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede cambiar a ese estado")

    order.status = payload.status
    db.commit()

    fresh_order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    if fresh_order is None:  # pragma: no cover - safety net after commit
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo actualizar el pedido")
    return _order_to_out(fresh_order)


@router.patch("/deltas/{delta_id}/status", response_model=OrderDeltaOut)
def update_order_delta_status(
    delta_id: int,
    payload: OrderStatusUpdate,
    db: DbSession,
    current_user: User = Depends(require_roles("admin", "kitchen")),
) -> OrderDeltaOut:
    delta = db.scalar(
        select(OrderDelta)
        .options(selectinload(OrderDelta.items), selectinload(OrderDelta.order))
        .where(
            OrderDelta.id == delta_id,
            OrderDelta.restaurant_id == current_user.restaurant_id,
        )
    )
    if delta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Correccion no encontrada")

    if current_user.role.code != "admin":
        allowed_next = ORDER_STATUS_FLOW.get(delta.status, set())
        if payload.status not in allowed_next:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede cambiar a ese estado")

    delta.status = payload.status
    db.commit()

    fresh_delta = db.scalar(
        select(OrderDelta)
        .options(selectinload(OrderDelta.items), selectinload(OrderDelta.order))
        .where(OrderDelta.id == delta.id)
    )
    if fresh_delta is None:  # pragma: no cover - safety net after commit
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo actualizar la correccion")
    return _delta_to_out(fresh_delta)
