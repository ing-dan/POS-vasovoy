# Arquitectura base

## 1. Analisis

Este POS debe operar en una LAN real, con uso continuo, baja friccion de operacion y tolerancia minima a fallos. El riesgo principal no es la velocidad de desarrollo, sino una decision tecnica mala que obligue a migraciones caras despues.

## 2. Propuesta

- PostgreSQL desde el inicio, sin SQLite intermedio
- Backend FastAPI con SQLAlchemy y Alembic
- Frontend React con React Query para estado remoto y Zustand para estado local de UI
- Contenedores separados para base de datos, API y frontend estatico
- Backups diarios con `pg_dump`
- Modelo de datos con `restaurant_id` en tablas raiz desde el dia 1

## 3. Arquitectura

### Capas

- `presentation`: endpoints HTTP, WebSocket y UI React
- `application`: casos de uso
- `domain`: reglas del negocio y entidades
- `infrastructure`: PostgreSQL, repositories, config, backups

### Servicios

- `db`: `postgres:16-alpine`
- `backend`: FastAPI + Uvicorn
- `frontend`: build estatico servido por Nginx

### Principios

- Configuracion en base de datos, no en codigo, cuando dependa del negocio
- No Redis, no Celery, no microservicios por ahora
- Un solo producto local, preparado para evolucionar a multi-tenant real

## 4. Riesgos

- Si se omite `restaurant_id` ahora, la migracion futura sera costosa
- Si se mezcla estado de servidor con UI, el frontend se vuelve fragil
- Si no existe backup automatizado, el producto no es comercialmente serio

## 5. Recomendaciones

- Mantener el MVP pequeno y modular
- Crear primero autenticacion, catalogo y pedidos
- Dejar preparado el KDS con WebSockets antes de escalar a nuevas ventas

## 6. Implementacion

La primera iteracion queda lista para:

- levantar infraestructura
- exponer `/health`
- arrancar con un esquema base de datos
- evolucionar modulo por modulo sin romper la estructura

