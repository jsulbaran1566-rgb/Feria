"""
Servidor de pruebas de extremo a extremo: el backend REAL con una base SQLite
en memoria y datos de ejemplo, escuchando en http://127.0.0.1:8000.

Se usa para probar el frontend contra el backend verdadero (sin PostgreSQL):
    cd backend && python3 tests/servidor_e2e.py
"""
import sys, os, importlib, pkgutil

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scr"))

from sqlalchemy import create_engine, event, func as _func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import Conexion.database as database

engine_sqlite = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)


@event.listens_for(engine_sqlite, "connect")
def _fk_on(conn, rec):
    conn.execute("PRAGMA foreign_keys=ON")


database.engine = engine_sqlite
database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_sqlite)

import Utilidades.ids as ids_mod


def _siguiente_id_sqlite(db, modelo):
    maximo_bd = db.query(_func.max(modelo.id)).scalar() or 0
    maximo_pendiente = max((o.id for o in db.new if isinstance(o, modelo) and o.id is not None), default=0)
    return max(maximo_bd, maximo_pendiente) + 1


ids_mod.siguiente_id = _siguiente_id_sqlite

import Modelos.models as models
import main as app_module
import Controladores

for _, modname, _ in pkgutil.iter_modules(Controladores.__path__):
    mod = importlib.import_module(f"Controladores.{modname}")
    if hasattr(mod, "siguiente_id"):
        mod.siguiente_id = _siguiente_id_sqlite

from Utilidades.seguridad import hashear_clave

database.Base.metadata.create_all(bind=engine_sqlite)

db = database.SessionLocal()
for i, n in [(1, "Administrador"), (2, "Productor"), (3, "Comprador")]:
    db.add(models.Rol(id=i, nombre=n, descripcion=n))
db.add(models.TipoDocumento(codigo="CC", nombre="Cédula de ciudadanía"))
for c in ("Hortaliza", "Fruta", "Tuberculo"):
    db.add(models.Categoria(nombre=c))
db.commit()
for uid, nombre, correo, rol, ciudad in [
    (1, "Admin Demo", "admin@agrodirecto.com", 1, "Bogotá"),
    (2, "Pedro Productor", "productor@agrodirecto.com", 2, "Tunja"),
    (3, "Carla Compradora", "comprador@agrodirecto.com", 3, "Bogotá"),
    (4, "Camilo Comprador", "comprador2@agrodirecto.com", 3, "Cali"),
]:
    db.add(models.Usuario(
        id=uid, nombre=nombre, correo=correo, telefono=f"30000000{uid:02d}", clave=hashear_clave("Clave1234!"),
        estado="Activo", rol_id=rol, tipo_documento="CC", numero_documento=f"1000000{uid}", ciudad=ciudad,
    ))
db.commit()
db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app_module.app, host="127.0.0.1", port=8000, log_level="warning")
