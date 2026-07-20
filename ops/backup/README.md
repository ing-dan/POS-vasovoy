# Backups

## Estrategia recomendada

- ejecutar `pg_dump` diario desde cron en el host RPi
- escribir el archivo comprimido en esta carpeta montada
- sincronizar luego a nube cuando el negocio lo permita

## Ejemplo de cron

```cron
0 2 * * * /usr/local/bin/pg_dump_daily.sh
```

