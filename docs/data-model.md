# Modelo de datos inicial

## Entidades raiz

- `restaurants`
- `restaurant_settings`
- `users`
- `roles`
- `products`
- `categories`
- `tables`
- `orders`
- `order_items`
- `payments`
- `ticket_prints`
- `audit_events`

## Regla multitenant

Toda tabla de negocio raiz debe incluir `restaurant_id` desde el comienzo.

## restaurant_settings

Esta tabla concentra la configuracion que cambia segun el negocio:

- nombre comercial
- moneda
- tasa de impuesto
- pie de ticket
- nomenclatura de mesas
- formatos de impresion

## Observacion de MVP

Aunque el MVP inicial use un solo restaurante, el modelo ya debe soportar varios sin migracion estructural.

## Auth

- `roles`: catalogo por restaurante para `admin`, `waiter`, `kitchen`
- `users`: credenciales y pertenencia a un rol dentro de un restaurante

