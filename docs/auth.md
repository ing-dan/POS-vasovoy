# Autenticacion y roles

## Objetivo

Permitir acceso seguro al POS con roles iniciales:

- administrador
- mesero
- cocina

## Decisiones

- autenticacion por usuario y contrasena
- token JWT de acceso
- hashing de contrasena con PBKDF2
- usuario actual resuelto en backend por `Authorization: Bearer`
- seeda inicial automatizada para crear el primer restaurante y el primer admin

## Permisos base

- `admin`: acceso total
- `waiter`: operacion de mesas y pedidos
- `kitchen`: vista y cambios del KDS

## Notas

La tabla `roles` ya nace ligada a `restaurant_id`, aunque en el MVP solo exista un restaurante.

