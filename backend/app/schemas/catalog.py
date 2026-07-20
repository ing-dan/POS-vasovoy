from pydantic import BaseModel, ConfigDict


class ProductCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sort_order: int


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_id: int
    category_id: int
    name: str
    description: str | None
    price: float
    image_url: str | None
    is_active: bool
    sort_order: int
    category: ProductCategoryOut


class ProductListOut(BaseModel):
    items: list[ProductOut]


class ProductUpsertResult(BaseModel):
    item: ProductOut


class ProductCategoryListOut(BaseModel):
    items: list[ProductCategoryOut]


class ProductCategoryCreateRequest(BaseModel):
    name: str
    sort_order: int | None = None


class ProductCategoryCreateResult(BaseModel):
    item: ProductCategoryOut


class ProductCategoryUpdateRequest(BaseModel):
    name: str
    sort_order: int = 0
