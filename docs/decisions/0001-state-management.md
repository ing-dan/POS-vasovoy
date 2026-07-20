# ADR 0001: Separacion de estado en frontend

## Decision

Usar React Query para estado del servidor y Zustand para estado local de UI.

## Contexto

El POS tendra datos altamente sincronizados: pedidos, mesas, KDS y pagos. Mezclar todo en un solo store local genera duplicacion, inconsistencia y recargas innecesarias.

## Consecuencias

- React Query gestiona cache, invalidacion y sincronizacion
- Zustand gestiona filtros, paneles abiertos, seleccion temporal y estado de interfaz
- La regla se documenta como decision, no como convension informal

