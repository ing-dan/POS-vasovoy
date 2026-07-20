from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.settings import get_settings
from app.dependencies import DbSession, get_current_user, require_roles
from app.models.product import Product
from app.models.product_category import ProductCategory
from app.models.user import User
from app.services.bootstrap import CATALOG_CATEGORY_NAMES
from app.schemas.catalog import (
    ProductCategoryCreateRequest,
    ProductCategoryCreateResult,
    ProductCategoryListOut,
    ProductCategoryOut,
    ProductCategoryUpdateRequest,
    ProductListOut,
    ProductOut,
    ProductUpsertResult,
)


router = APIRouter(prefix="/catalog", tags=["catalog"])
settings = get_settings()


def _media_root() -> Path:
    media_root = Path(settings.media_root)
    media_root.mkdir(parents=True, exist_ok=True)
    (media_root / "products").mkdir(parents=True, exist_ok=True)
    return media_root


def _image_url(image_path: str | None) -> str | None:
    if not image_path:
        return None
    return f"/media/{image_path.replace(os.sep, '/')}"


def _category_to_out(category: ProductCategory) -> ProductCategoryOut:
    return ProductCategoryOut.model_validate(category)


def _product_to_out(product: Product) -> ProductOut:
    return ProductOut(
        id=product.id,
        restaurant_id=product.restaurant_id,
        category_id=product.category_id,
        name=product.name,
        description=product.description,
        price=float(product.price),
        image_url=_image_url(product.image_path),
        is_active=product.is_active,
        sort_order=product.sort_order,
        category=_category_to_out(product.category),
    )


def _guess_extension(upload: UploadFile) -> str:
    filename_ext = Path(upload.filename or "").suffix.lower()
    if filename_ext in {".jpg", ".jpeg", ".png", ".webp"}:
        return ".jpg" if filename_ext == ".jpeg" else filename_ext

    content_type = (upload.content_type or "").lower()
    if content_type == "image/png":
        return ".png"
    if content_type == "image/webp":
        return ".webp"
    return ".jpg"


def _save_image(product: Product, upload: UploadFile | None) -> str | None:
    if upload is None:
        return product.image_path

    media_root = _media_root()
    products_dir = media_root / "products"
    ext = _guess_extension(upload)
    filename = f"{product.restaurant_id}_{product.id}_{uuid.uuid4().hex}{ext}"
    target = products_dir / filename

    upload.file.seek(0)
    with target.open("wb") as target_file:
        shutil.copyfileobj(upload.file, target_file)

    if product.image_path:
        previous = media_root / product.image_path
        if previous.exists():
            previous.unlink()

    return f"products/{filename}"


@router.get("/categories", response_model=ProductCategoryListOut)
def list_categories(
    db: DbSession,
    current_user: User = Depends(get_current_user),
) -> ProductCategoryListOut:
    categories = db.scalars(
        select(ProductCategory)
        .where(ProductCategory.restaurant_id == current_user.restaurant_id)
        .order_by(ProductCategory.sort_order, ProductCategory.name)
    ).all()
    return ProductCategoryListOut(items=[_category_to_out(category) for category in categories])


@router.post("/categories", response_model=ProductCategoryCreateResult)
def create_category(
    payload: ProductCategoryCreateRequest,
    db: DbSession,
    current_user: User = Depends(require_roles("admin")),
) -> ProductCategoryCreateResult:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de la categoria es obligatorio")

    existing = db.scalar(
        select(ProductCategory).where(
            ProductCategory.restaurant_id == current_user.restaurant_id,
            ProductCategory.name == name,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La categoria ya existe")

    sort_order = payload.sort_order
    if sort_order is None:
        max_sort_order = db.scalar(
            select(ProductCategory.sort_order)
            .where(ProductCategory.restaurant_id == current_user.restaurant_id)
            .order_by(ProductCategory.sort_order.desc())
            .limit(1)
        )
        sort_order = int(max_sort_order or 0) + 1

    category = ProductCategory(
        restaurant_id=current_user.restaurant_id,
        name=name,
        sort_order=sort_order,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return ProductCategoryCreateResult(item=_category_to_out(category))


@router.put("/categories/{category_id}", response_model=ProductCategoryCreateResult)
def update_category(
    category_id: int,
    payload: ProductCategoryUpdateRequest,
    db: DbSession,
    current_user: User = Depends(require_roles("admin")),
) -> ProductCategoryCreateResult:
    category = db.scalar(
        select(ProductCategory).where(
            ProductCategory.id == category_id,
            ProductCategory.restaurant_id == current_user.restaurant_id,
        )
    )
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de la categoria es obligatorio")

    duplicate = db.scalar(
        select(ProductCategory).where(
            ProductCategory.restaurant_id == current_user.restaurant_id,
            ProductCategory.name == name,
            ProductCategory.id != category.id,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La categoria ya existe")

    category.name = name
    category.sort_order = payload.sort_order
    db.commit()
    db.refresh(category)
    return ProductCategoryCreateResult(item=_category_to_out(category))


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: DbSession,
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, bool]:
    category = db.scalar(
        select(ProductCategory).where(
            ProductCategory.id == category_id,
            ProductCategory.restaurant_id == current_user.restaurant_id,
        )
    )
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada")

    has_products = db.scalar(select(Product.id).where(Product.category_id == category.id).limit(1))
    if has_products is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se puede eliminar una categoria con productos asignados")

    db.delete(category)
    db.commit()
    return {"ok": True}


@router.get("/products", response_model=ProductListOut)
def list_products(
    db: DbSession,
    current_user: User = Depends(get_current_user),
) -> ProductListOut:
    products = db.scalars(
        select(Product)
        .options(selectinload(Product.category))
        .join(Product.category)
        .where(
            Product.restaurant_id == current_user.restaurant_id,
        )
        .order_by(Product.sort_order, Product.name)
    ).all()
    return ProductListOut(items=[_product_to_out(product) for product in products])


@router.post("/products", response_model=ProductUpsertResult)
def create_product(
    db: DbSession,
    name: str = Form(...),
    category_id: int = Form(...),
    price: float = Form(...),
    description: str | None = Form(None),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    image: UploadFile | None = File(None),
    current_user: User = Depends(require_roles("admin")),
) -> ProductUpsertResult:
    category = db.scalar(
        select(ProductCategory).where(
            ProductCategory.id == category_id,
            ProductCategory.restaurant_id == current_user.restaurant_id,
        )
    )
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada")

    product = Product(
        restaurant_id=current_user.restaurant_id,
        category_id=category.id,
        name=name.strip(),
        description=description.strip() if description else None,
        price=price,
        is_active=is_active,
        sort_order=sort_order,
    )
    db.add(product)
    db.flush()

    product.image_path = _save_image(product, image)
    db.commit()
    fresh_product = db.scalar(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.id == product.id)
    )
    if fresh_product is None:  # pragma: no cover - safety net after commit
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo cargar el producto")
    return ProductUpsertResult(item=_product_to_out(fresh_product))


@router.put("/products/{product_id}", response_model=ProductUpsertResult)
def update_product(
    product_id: int,
    db: DbSession,
    name: str = Form(...),
    category_id: int = Form(...),
    price: float = Form(...),
    description: str | None = Form(None),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    image: UploadFile | None = File(None),
    current_user: User = Depends(require_roles("admin")),
) -> ProductUpsertResult:
    product = db.scalar(
        select(Product)
        .options(selectinload(Product.category))
        .where(
            Product.id == product_id,
            Product.restaurant_id == current_user.restaurant_id,
        )
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    category = db.scalar(
        select(ProductCategory).where(
            ProductCategory.id == category_id,
            ProductCategory.restaurant_id == current_user.restaurant_id,
        )
    )
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada")

    product.name = name.strip()
    product.category_id = category.id
    product.price = price
    product.description = description.strip() if description else None
    product.sort_order = sort_order
    product.is_active = is_active

    if image is not None:
        product.image_path = _save_image(product, image)

    db.commit()
    fresh_product = db.scalar(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.id == product.id)
    )
    if fresh_product is None:  # pragma: no cover - safety net after commit
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo cargar el producto")
    return ProductUpsertResult(item=_product_to_out(fresh_product))


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: DbSession,
    current_user: User = Depends(require_roles("admin")),
) -> dict[str, bool]:
    product = db.scalar(
        select(Product).where(
            Product.id == product_id,
            Product.restaurant_id == current_user.restaurant_id,
        )
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    if product.image_path:
        media_root = _media_root()
        previous = media_root / product.image_path
        if previous.exists():
            previous.unlink()

    db.delete(product)
    db.commit()
    return {"ok": True}
