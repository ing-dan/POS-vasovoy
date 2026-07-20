# Infraestructura

## Docker Compose

Servicios requeridos:

- `db`: `postgres:16-alpine`
- `backend`: FastAPI + Uvicorn
- `frontend`: build estatico servido por Nginx

## Backups

Estrategia recomendada para el MVP en RPi:

- `pg_dump` diario ejecutado por cron en el host
- salida a una carpeta montada en el volumen de backups
- sincronizacion a nube cuando la operacion lo permita

## Observacion

No se agrega un cuarto servicio para backups para respetar la simplicidad operativa pedida.

