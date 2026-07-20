from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.catalog import router as catalog_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.orders import router as orders_router
from app.api.settings import router as settings_router
from app.api.users import router as users_router
from app.core.settings import get_settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
import app.models  # noqa: F401
from app.services.bootstrap import bootstrap_initial_data


settings = get_settings()
media_root = Path(settings.media_root)
media_root.mkdir(parents=True, exist_ok=True)
(media_root / "products").mkdir(parents=True, exist_ok=True)

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(orders_router)
app.include_router(settings_router)
app.include_router(users_router)
app.mount("/media", StaticFiles(directory=str(media_root)), name="media")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        bootstrap_initial_data(db)
