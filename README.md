# POS Restaurante MVP

Base tecnica para un POS local-first para restaurantes, pensado para crecer a multi-sucursal y SaaS sin rehacer el nucleo.

## Alcance de esta base

- PostgreSQL desde el dia 1
- Docker Compose con 3 servicios: `db`, `backend`, `frontend`
- Backend con FastAPI y Uvicorn
- Frontend React servido como estatico por Nginx
- Endpoint `GET /health`
- Preparacion multitenant con `restaurant_id` desde el modelo de datos
- Tabla `restaurant_settings` para toda la configuracion de negocio
- Documento de decision para separar estado servidor/UI
- Estrategia de backups diaria con `pg_dump`

## Estructura

- `backend/`: API, dominio y persistencia
- `frontend/`: UI React
- `docs/`: arquitectura y decisiones
- `ops/backup/`: scripts y ejemplos de backup

## Siguiente paso

El siguiente modulo recomendado es:

1. autenticacion y roles
2. productos
3. mesas
4. pedidos y KDS

