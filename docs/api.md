# API base

## Salud

- `GET /health`

## Autenticacion y roles

- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/roles`

## Futuro inmediato

- `GET /products`
- `POST /products`
- `GET /tables`
- `POST /orders`
- `PATCH /orders/{id}`
- `POST /orders/{id}/payments`
- `WS /ws/kitchen`

## Criterios

- El backend debe exponer contratos estables desde el inicio
- El frontend no debe asumir forma interna de los modelos
- El estado remoto vive en React Query
- El estado temporal de la UI vive en Zustand
