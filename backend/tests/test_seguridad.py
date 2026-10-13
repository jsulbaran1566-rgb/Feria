"""
Pruebas de seguridad: endpoints protegidos, perfil propio, cambio de clave
verificado y regla de contraseña segura.

Correr:  cd backend && python3 tests/test_seguridad.py
"""
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scr"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import Conexion.database as database

engine_sqlite = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
database.engine = engine_sqlite
database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_sqlite)

import main as app_module
import Modelos.models as models
from fastapi.testclient import TestClient
from Utilidades.seguridad import hashear_clave

database.Base.metadata.create_all(bind=engine_sqlite)
client = TestClient(app_module.app)

CLAVE = "Clave1234!"
fallos = 0


def check(nombre, cond, detalle=""):
    global fallos
    if cond:
        print(f"  OK   {nombre}")
    else:
        fallos += 1
        print(f"  FAIL {nombre} {detalle}")


def preparar():
    db = database.SessionLocal()
    for i, n in [(1, "Administrador"), (2, "Productor"), (3, "Comprador")]:
        db.add(models.Rol(id=i, nombre=n, descripcion=n))
    db.add(models.TipoDocumento(codigo="CC", nombre="Cedula"))
    db.commit()
    for uid, nombre, correo, rol in [
        (1, "Admin", "admin@t.com", 1), (2, "Prod", "prod@t.com", 2), (3, "Comp", "comp@t.com", 3),
    ]:
        db.add(models.Usuario(
            id=uid, nombre=nombre, correo=correo, telefono=f"300000000{uid}",
            clave=hashear_clave(CLAVE), estado="Activo", rol_id=rol,
            tipo_documento="CC", numero_documento=f"1000000{uid}",
            ciudad="Bogotá", direccion="Calle secreta 123",
        ))
    db.commit()
    db.close()


def token(correo, clave=CLAVE):
    r = client.post("/auth/login", json={"correo": correo, "clave": clave})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['data']['token']}"}


preparar()
admin, prod, comp = token("admin@t.com"), token("prod@t.com"), token("comp@t.com")

print("\n=== GET /usuarios (solo Administrador) ===")
check("Sin sesión: 401", client.get("/usuarios").status_code == 401)
check("Comprador: 403", client.get("/usuarios", headers=comp).status_code == 403)
check("Administrador: 200", client.get("/usuarios", headers=admin).status_code == 200)

print("\n=== GET /usuarios/me ===")
check("Sin sesión: 401", client.get("/usuarios/me").status_code == 401)
r = client.get("/usuarios/me", headers=comp)
check("Devuelve el usuario con sesión", r.status_code == 200 and r.json()["data"]["correo"] == "comp@t.com", r.text)

print("\n=== Datos públicos sin información personal ===")
r = client.get("/usuarios/productores")
check("Productores públicos: 200 sin sesión", r.status_code == 200)
campos = set(r.json()["data"][0].keys())
check("No expone correo/teléfono/documento/dirección",
      not campos & {"correo", "telefono", "numero_documento", "direccion"}, str(campos))
r = client.get("/usuarios/resumen-publico")
check("Resumen público con conteos", r.status_code == 200 and r.json()["data"]["compradores"] == 1, r.text)

print("\n=== Compras, ventas e historiales ===")
for ruta in ("/compras", "/ventas"):
    check(f"{ruta} sin sesión: 401", client.get(ruta).status_code == 401)
    check(f"{ruta} Comprador: 403", client.get(ruta, headers=comp).status_code == 403)
    check(f"{ruta} Administrador: 200", client.get(ruta, headers=admin).status_code == 200)
for ruta in ("/historial_seguimiento", "/historial_reservas"):
    check(f"{ruta} sin sesión: 401", client.get(ruta).status_code == 401)
    check(f"{ruta} Comprador: 403", client.get(ruta, headers=comp).status_code == 403)
    check(f"{ruta} Productor: 200", client.get(ruta, headers=prod).status_code == 200)
    check(f"{ruta} Administrador: 200", client.get(ruta, headers=admin).status_code == 200)

print("\n=== POST /auth/cambiar-clave ===")
nueva = "NuevaClave2026!"
check("Sin sesión: 401", client.post("/auth/cambiar-clave", json={"clave_actual": CLAVE, "clave_nueva": nueva}).status_code == 401)
r = client.post("/auth/cambiar-clave", headers=comp, json={"clave_actual": "Incorrecta1!", "clave_nueva": nueva})
check("Clave actual incorrecta: 400 (no 401)", r.status_code == 400, r.text)
r = client.post("/auth/cambiar-clave", headers=comp, json={"clave_actual": CLAVE, "clave_nueva": CLAVE})
check("Nueva igual a la actual: 400", r.status_code == 400, r.text)
r = client.post("/auth/cambiar-clave", headers=comp, json={"clave_actual": CLAVE, "clave_nueva": "debil"})
check("Nueva débil: rechazada", r.status_code in (400, 422), r.text)
r = client.post("/auth/cambiar-clave", headers=comp, json={"clave_actual": CLAVE, "clave_nueva": nueva})
check("Cambio correcto: 200", r.status_code == 200, r.text)
check("Login con la nueva funciona", client.post("/auth/login", json={"correo": "comp@t.com", "clave": nueva}).status_code == 200)
check("Login con la anterior falla", client.post("/auth/login", json={"correo": "comp@t.com", "clave": CLAVE}).status_code == 401)

print("\n=== Regla de contraseña segura ===")
base = {"id": 50, "tipo_documento": "CC", "numero_documento": "55555555", "nombre": "Nuevo", "correo": "nuevo@t.com", "telefono": "3011111111", "rol_id": 3}
for clave in ("corta1!", "sinmayuscula1!", "SinNumero!!", "SinEspecial12"):
    r = client.post("/usuarios", json={**base, "clave": clave})
    check(f"Registro rechaza '{clave}' por la regla de contraseña",
          r.status_code in (400, 422) and "contraseña" in r.text, r.text)
r = client.post("/usuarios", json={**base, "clave": "Segura2026!"})
check("Registro acepta 'Segura2026!'", r.status_code in (200, 201), r.text)

print(f"\n{'TODAS LAS PRUEBAS DE SEGURIDAD PASARON' if not fallos else str(fallos) + ' FALLOS'}\n")
sys.exit(1 if fallos else 0)
