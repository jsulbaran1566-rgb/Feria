"""
Pruebas de la recuperación de contraseña SIMULADA (sin correo/SMTP).

Correr:  cd backend && python3 tests/test_recuperacion.py
"""
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scr"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import Conexion.database as database

engine_sqlite = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
database.engine = engine_sqlite
database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_sqlite)

import main as app_module
import Modelos.models as models
from fastapi.testclient import TestClient
from Utilidades.seguridad import hashear_clave, crear_token

database.Base.metadata.create_all(bind=engine_sqlite)
client = TestClient(app_module.app)

CORREO = "usuario@ejemplo.com"
CLAVE_ORIGINAL = "ClaveOriginal1!"
CLAVE_NUEVA = "ClaveNueva2026!"


def preparar_datos():
    db = database.SessionLocal()
    db.add(models.Rol(id=1, nombre="Comprador", descripcion="Comprador"))
    db.add(models.TipoDocumento(codigo="CC", nombre="Cedula de Ciudadania"))
    db.commit()
    for uid, correo, estado, tel in [
        (999, CORREO, "Activo", "3001234567"),
        (998, "inactivo@ejemplo.com", "Inactivo", "3009999999"),
    ]:
        db.add(models.Usuario(
            id=uid, nombre="Usuario Prueba", correo=correo, telefono=tel,
            clave=hashear_clave(CLAVE_ORIGINAL), estado=estado, rol_id=1,
            tipo_documento="CC", numero_documento=str(10000000 + uid),
        ))
    db.commit()
    db.close()


def login(correo, clave):
    return client.post("/auth/login", json={"correo": correo, "clave": clave})


def test_flujo_completo():
    preparar_datos()

    # 1. Solicitar recuperación: devuelve token simulado (sin enviar correo)
    r = client.post("/auth/recuperar-clave", json={"correo": CORREO})
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["simulado"] is True
    token = data.get("token_recuperacion")
    assert token, "Debe devolver el token simulado para un usuario activo"
    print("  OK   /auth/recuperar-clave devuelve token simulado (sin correo)")

    # 2. Restablecer con ese token
    r = client.post("/auth/restablecer-clave", json={"token": token, "clave_nueva": CLAVE_NUEVA})
    assert r.status_code == 200, r.text
    print("  OK   /auth/restablecer-clave actualiza la clave en la base de datos")

    # 3. La clave nueva funciona y la vieja ya no
    assert login(CORREO, CLAVE_NUEVA).status_code == 200
    assert login(CORREO, CLAVE_ORIGINAL).status_code != 200
    print("  OK   Login con la clave nueva; la anterior deja de funcionar")

    # 4. El token es de un solo uso
    r = client.post("/auth/restablecer-clave", json={"token": token, "clave_nueva": "OtraClave3000!"})
    assert r.status_code != 200, "El token no debe poder reutilizarse"
    assert login(CORREO, CLAVE_NUEVA).status_code == 200
    print("  OK   El token de recuperación es de un solo uso")


def test_correo_desconocido_o_inactivo_sin_token():
    for correo in ("noexiste@ejemplo.com", "inactivo@ejemplo.com"):
        r = client.post("/auth/recuperar-clave", json={"correo": correo})
        assert r.status_code == 200, r.text
        assert "token_recuperacion" not in r.json()["data"]
    print("  OK   Correo inexistente o inactivo: 200 sin token")


def test_tokens_invalidos():
    # Token basura
    r = client.post("/auth/restablecer-clave", json={"token": "basura", "clave_nueva": CLAVE_NUEVA})
    assert r.status_code != 200
    # Un token de SESIÓN no sirve para restablecer
    token_sesion = crear_token({"sub": "999", "correo": CORREO, "rol": "Comprador"})
    r = client.post("/auth/restablecer-clave", json={"token": token_sesion, "clave_nueva": CLAVE_NUEVA})
    assert r.status_code != 200
    # Token de recuperación de un usuario inactivo
    token_inactivo = crear_token({"sub": "998", "tipo": "recuperacion"}, minutos=15)
    r = client.post("/auth/restablecer-clave", json={"token": token_inactivo, "clave_nueva": CLAVE_NUEVA})
    assert r.status_code != 200
    # Un token de recuperación NO sirve para iniciar sesión en la API
    token_rec = crear_token({"sub": "999", "tipo": "recuperacion"}, minutos=15)
    r = client.get("/usuarios/compradores", headers={"Authorization": f"Bearer {token_rec}"})
    assert r.status_code in (401, 403)
    print("  OK   Tokens inválidos, de sesión, de usuario inactivo o de recuperación usados como sesión: rechazados")


if __name__ == "__main__":
    print("\n=== Pruebas de recuperación de contraseña simulada ===")
    test_flujo_completo()
    test_correo_desconocido_o_inactivo_sin_token()
    test_tokens_invalidos()
    print("\nTODAS LAS PRUEBAS DE RECUPERACIÓN PASARON\n")
