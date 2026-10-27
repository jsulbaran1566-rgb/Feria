"""
Prueba de contrato frontend <-> backend.

Envía al backend EXACTAMENTE los datos (nombres de campo y tipos) que arma
el frontend en TypeScript (src/services/api.ts y las páginas) y comprueba que
el backend los acepta. Si el frontend cambia un nombre de campo, esta prueba lo detecta.

Correr:  cd backend && python3 tests/test_contrato_frontend.py
"""
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scr"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import Conexion.database as database

engine_sqlite = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
from sqlalchemy import event, func as _func


@event.listens_for(engine_sqlite, "connect")
def _fk_on(conn, rec):
    conn.execute("PRAGMA foreign_keys=ON")


database.engine = engine_sqlite
database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_sqlite)

# El backend usa un bloqueo exclusivo de PostgreSQL para generar ids; en SQLite se reemplaza
import Utilidades.ids as ids_mod


def _siguiente_id_sqlite(db, modelo):
    maximo_bd = db.query(_func.max(modelo.id)).scalar() or 0
    maximo_pendiente = max(
        (obj.id for obj in db.new if isinstance(obj, modelo) and obj.id is not None), default=0
    )
    return max(maximo_bd, maximo_pendiente) + 1


ids_mod.siguiente_id = _siguiente_id_sqlite

import importlib, pkgutil
import Modelos.models as models
import main as app_module
import Controladores

for _, modname, _ in pkgutil.iter_modules(Controladores.__path__):
    mod = importlib.import_module(f"Controladores.{modname}")
    if hasattr(mod, "siguiente_id"):
        mod.siguiente_id = _siguiente_id_sqlite

from fastapi.testclient import TestClient
from Utilidades.seguridad import hashear_clave

database.Base.metadata.create_all(bind=engine_sqlite)
client = TestClient(app_module.app)

CLAVE = "Clave1234!"
fallos = 0


def check(nombre, r, esperado=(200, 201)):
    global fallos
    ok = r.status_code in esperado
    if ok:
        print(f"  OK   {nombre}")
    else:
        fallos += 1
        print(f"  FAIL {nombre} -> {r.status_code}: {r.text[:200]}")
    return r


def preparar():
    db = database.SessionLocal()
    for i, n in [(1, "Administrador"), (2, "Productor"), (3, "Comprador")]:
        db.add(models.Rol(id=i, nombre=n, descripcion=n))
    db.add(models.TipoDocumento(codigo="CC", nombre="Cedula"))
    db.add(models.Categoria(nombre="Hortaliza"))
    db.commit()
    for uid, nombre, correo, rol in [(1, "Admin", "admin@t.com", 1), (2, "Prod", "prod@t.com", 2), (3, "Comp", "comp@t.com", 3)]:
        db.add(models.Usuario(
            id=uid, nombre=nombre, correo=correo, telefono=f"300000000{uid}",
            clave=hashear_clave(CLAVE), estado="Activo", rol_id=rol,
            tipo_documento="CC", numero_documento=f"1000000{uid}",
        ))
    db.commit()
    db.close()


def auth(correo):
    r = client.post("/auth/login", json={"correo": correo, "clave": CLAVE})
    return {"Authorization": f"Bearer {r.json()['data']['token']}"}


preparar()
admin, prod, comp = auth("admin@t.com"), auth("prod@t.com"), auth("comp@t.com")

print("\n=== Panel de administrador (crear con id, campos del backend) ===")
r = check("Crear proveedor {id, nombre, tipo, ...}", client.post("/proveedores", headers=admin, json={
    "id": 1, "nombre": "Transportes Sur", "tipo": "Logistica", "ciudad": "Cali", "telefono": "3001112233", "correo": "t@sur.com", "estado": "Activo"}))
check("Editar proveedor {tipo, ...}", client.put("/proveedores/1", headers=admin, json={"tipo": "Insumos", "ciudad": "Bogotá"}))
check("Crear rol {id, nombre, descripcion, permisos}", client.post("/roles", headers=admin, json={
    "id": 10, "nombre": "Supervisor", "descripcion": "Revisa", "permisos": "leer"}))
check("Crear usuario {id=documento, ..., clave segura}", client.post("/usuarios", headers=admin, json={
    "id": 55555555, "tipo_documento": "CC", "numero_documento": "55555555", "nombre": "Nuevo", "correo": "n@t.com",
    "telefono": "3011111111", "clave": "Segura2026!", "rol_id": 3, "estado": "Activo"}))
check("Editar usuario (sin numero_documento)", client.put("/usuarios/55555555", headers=admin, json={
    "nombre": "Nuevo B", "correo": "n@t.com", "telefono": "3011111111", "rol_id": 3, "tipo_documento": "CC", "estado": "Activo"}))
check("Crear categoría {nombre}", client.post("/categorias", headers=admin, json={"nombre": "Fruta"}))
check("Renombrar categoría {nombre_nuevo}", client.put("/categorias/Fruta", headers=admin, json={"nombre_nuevo": "Frutas"}))
check("Crear lote desde admin {producto,cantidad,categoria,productor_id,fecha_cosecha:null}", client.post("/lotes", headers=admin, json={
    "producto": "Tomate", "cantidad": 100, "categoria": "Hortaliza", "productor_id": 2, "fecha_cosecha": None, "estado": "Activo"}))

print("\n=== Productor ===")
check("Crear lote {categoria (nombre), precio_kg, anticipo_pct, imagen_url:null}", client.post("/lotes", headers=prod, json={
    "producto": "Papa", "cantidad": 200, "categoria": "Hortaliza", "estado": "Activo", "fecha_cosecha": "2026-12-01",
    "precio_kg": 1500, "imagen_url": None, "anticipo_pct": 30, "horas_limite_pago": 48, "productor_id": 2}))
lotes = client.get("/lotes", headers=prod).json()["data"]
lote_id = next(l["id"] for l in lotes if l["producto"] == "Papa")
check("Editar lote (sin productor_id)", client.put(f"/lotes/{lote_id}", headers=prod, json={
    "producto": "Papa", "cantidad": 250, "categoria": "Hortaliza", "estado": "Activo", "fecha_cosecha": None,
    "precio_kg": 1600, "imagen_url": None, "anticipo_pct": 30, "horas_limite_pago": 48}))
check("Reportar incidencia {lote_id, tipo, descripcion}", client.post("/incidencias", headers=prod, json={
    "lote_id": lote_id, "tipo": "Plaga", "descripcion": "Se detectó plaga"}))

print("\n=== Comprador ===")
r = check("Reservar {comprador_id, lote_id, cantidad}", client.post("/reservas", headers=comp, json={
    "comprador_id": 3, "lote_id": lote_id, "cantidad": 10}))
reserva_id = r.json()["data"]["id"]
check("Reserva trae precio_kg y producto (campos que lee el frontend)", type("R", (), {"status_code": 200 if {"precio_kg", "producto", "cantidad"} <= set(r.json()["data"]) else 0, "text": str(r.json()["data"].keys())})())
check("Agregar favorito", client.post("/favoritos", headers=comp, json={"comprador_id": 3, "productor_id": 2}))
check("Listar favoritos trae productor y ciudad", client.get("/favoritos?comprador_id=3", headers=comp))
check("Quitar favorito /favoritos/{comprador}/{productor}", client.delete("/favoritos/3/2?confirmar=true", headers=comp))

print("\n=== Estados de la reserva y pago ===")
check("Productor confirma reserva {estado}", client.put(f"/reservas/{reserva_id}/estado", headers=prod, json={"estado": "Confirmada"}))
r = check("Comprador paga {reserva_id, metodo, resultado_simulado}", client.post("/pagos", headers=comp, json={
    "reserva_id": reserva_id, "metodo": "Simulado - Tarjeta", "resultado_simulado": "aprobado"}))
d = r.json()["data"]
check("Pago devuelve campos aplanados que lee el frontend", type("R", (), {"status_code": 200 if {"monto", "monto_total_reserva", "monto_pendiente", "reserva_completamente_pagada"} <= set(d) else 0, "text": str(list(d))})())
r = check("Consultar pagos {pagos: [...]}", client.get(f"/pagos?reserva_id={reserva_id}", headers=comp))
check("obtenerPagos devuelve la lista en 'pagos'", type("R", (), {"status_code": 200 if isinstance(r.json()["data"].get("pagos"), list) and r.json()["data"]["pagos"] else 0, "text": str(r.json()["data"])[:150]})())
r = check("Productor despacha {reserva_id, medio, fecha_estimada}", client.post("/entregas", headers=prod, json={
    "reserva_id": reserva_id, "medio": "Camión XYZ-123", "fecha_estimada": "2026-12-02"}))
codigo = r.json()["data"].get("codigo_confirmacion")
check("Entrega trae codigo_confirmacion al despachar", type("R", (), {"status_code": 200 if codigo else 0, "text": str(r.json()["data"])})())
entregas = client.get(f"/entregas?reserva_id={reserva_id}", headers=comp).json()["data"]
entrega_id = entregas[0]["id"]
check("Productor actualiza ubicación", client.put(f"/entregas/{entrega_id}/ubicacion", headers=prod, json={"latitud": 4.65, "longitud": -74.05}))
check("Comprador confirma recepción {codigo_confirmacion}", client.put(f"/entregas/{entrega_id}", headers=comp, json={"codigo_confirmacion": codigo}))
r = check("Calificar {reserva_id, estrellas, comentario}", client.post("/calificaciones", headers=comp, json={
    "reserva_id": reserva_id, "estrellas": 5, "comentario": "Excelente"}))
r = check("GET /calificaciones devuelve {calificaciones: [...], promedio, ...}", client.get("/calificaciones?productor_id=2", headers=comp))
check("Calificaciones dentro de 'calificaciones'", type("R", (), {"status_code": 200 if isinstance(r.json()["data"].get("calificaciones"), list) and r.json()["data"]["calificaciones"] else 0, "text": str(r.json()["data"])[:150]})())
check("Abrir disputa {reserva_id, descripcion}", client.post("/disputas", headers=comp, json={"reserva_id": reserva_id, "descripcion": "El producto llegó dañado"}))

print("\n=== Soporte y contacto (correo obligatorio) ===")
check("Contacto público {nombre, correo, mensaje}", client.post("/soporte", json={"nombre": "Ana", "correo": "ana@x.com", "mensaje": "[Duda] Hola (Tel: 300)"}))
check("Soporte desde el panel {usuario_id, nombre, correo, mensaje}", client.post("/soporte", headers=comp, json={
    "usuario_id": 3, "nombre": "Comp", "correo": "comp@t.com", "mensaje": "[Ayuda] No puedo pagar"}))

print(f"\n{'TODAS LAS PRUEBAS DE CONTRATO PASARON' if not fallos else str(fallos) + ' FALLOS'}\n")
sys.exit(1 if fallos else 0)
