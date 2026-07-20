from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.dependencies import DbSession, require_roles
from app.models.restaurant import Restaurant
from app.models.settings import RestaurantSettings
from app.models.user import User
from app.schemas.settings import RestaurantSettingsOut, RestaurantSettingsResponse, RestaurantSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


def _settings_to_out(settings: RestaurantSettings) -> RestaurantSettingsOut:
    return RestaurantSettingsOut.model_validate(settings)


@router.get("", response_model=RestaurantSettingsResponse)
def get_settings(db: DbSession, current_user: User = Depends(require_roles("admin"))) -> RestaurantSettingsResponse:
    settings = db.scalar(select(RestaurantSettings).where(RestaurantSettings.restaurant_id == current_user.restaurant_id))
    if settings is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuracion no encontrada")
    return RestaurantSettingsResponse(item=_settings_to_out(settings))


@router.patch("", response_model=RestaurantSettingsResponse)
def update_settings(
    payload: RestaurantSettingsUpdate,
    db: DbSession,
    current_user: User = Depends(require_roles("admin")),
) -> RestaurantSettingsResponse:
    settings = db.scalar(select(RestaurantSettings).where(RestaurantSettings.restaurant_id == current_user.restaurant_id))
    restaurant = db.get(Restaurant, current_user.restaurant_id)
    if settings is None or restaurant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuracion no encontrada")

    settings.business_name = payload.business_name.strip()
    settings.currency_code = payload.currency_code.strip().upper()
    settings.tax_rate = payload.tax_rate
    settings.receipt_footer = payload.receipt_footer.strip() if payload.receipt_footer else None
    settings.table_label_singular = payload.table_label_singular.strip()
    settings.table_label_plural = payload.table_label_plural.strip()
    restaurant.name = payload.business_name.strip()
    db.commit()
    db.refresh(settings)
    return RestaurantSettingsResponse(item=_settings_to_out(settings))
