# Pruebas de integración

`test_integracion.py` corre la app real de FastAPI (el mismo código de
`backend/scr`) contra una base SQLite temporal en memoria, y ejercita el
flujo completo mediante peticiones HTTP reales: registro, login, RBAC,
lotes (RF-07/08/11), reservas (RF-17, plazo de pago, motivo de
cancelación), pagos (completo, anticipo/saldo, comisión), entregas,
calificaciones, disputas con reembolso, y notificaciones.

No requiere PostgreSQL instalado — usa SQLite solo para las pruebas.
Diferencias conocidas frente a Postgres en producción:
- El candado `pg_advisory_xact_lock` de `Utilidades/ids.py` no existe en
  SQLite; se sustituye por una versión sin candado (no hace falta para
  pruebas de un solo hilo).
- `ILIKE` en filtros de categoría se traduce razonablemente en SQLite,
  pero no es una prueba exhaustiva de compatibilidad con Postgres.

Para correrlo:
    cd backend
    pip install httpx --break-system-packages   # si no lo tienes
    python3 tests/test_integracion.py

Esto NO reemplaza una suite de pruebas unitarias con pytest (RNF-08 sigue
pendiente) — es una verificación funcional de extremo a extremo para
detectar regresiones rápido antes de entregar una nueva versión.
