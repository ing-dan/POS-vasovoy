from pydantic import BaseModel, ConfigDict, Field


class RestaurantSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_id: int
    business_name: str
    currency_code: str
    tax_rate: float
    receipt_footer: str | None
    table_label_singular: str
    table_label_plural: str


class RestaurantSettingsUpdate(BaseModel):
    business_name: str = Field(min_length=1, max_length=120)
    currency_code: str = Field(default="MXN", min_length=3, max_length=3)
    tax_rate: float = Field(ge=0)
    receipt_footer: str | None = Field(default=None, max_length=500)
    table_label_singular: str = Field(default="Mesa", min_length=1, max_length=40)
    table_label_plural: str = Field(default="Mesas", min_length=1, max_length=40)


class RestaurantSettingsResponse(BaseModel):
    item: RestaurantSettingsOut
