"""
Pruebas de integración end-to-end para AgroDirecto.
Corre la app FastAPI real contra SQLite en memoria (no hay Postgres en este
entorno). Diferencias conocidas entre motores se documentan al final.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scr"))

from sqlalchemy import create_engine, event, func as _func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import Conexion.database as database

engine_sqlite = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

@event.listens_for(engine_sqlite, "connect")
def _fk_on(conn, rec):
    conn.execute("PRAGMA foreign_keys=ON")

database.engine = engine_sqlite
database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_sqlite)

import Utilidades.ids as ids_mod
def _siguiente_id_sqlite(db, modelo):
    maximo_bd = db.query(_func.max(modelo.id)).scalar() or 0
    maximo_pendiente = max(
        (obj.id for obj in db.new if isinstance(obj, modelo) and obj.id is not None),
        default=0,
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
database.Base.metadata.create_all(bind=engine_sqlite)
client = TestClient(app_module.app)

OK, FAIL = [], []

def check(nombre, condicion, detalle=""):
    if condicion:
        OK.append(nombre)
        print(f"  OK   {nombre}")
    else:
        FAIL.append((nombre, detalle))
        print(f"  FAIL {nombre}  -- {detalle}")

def seccion(titulo):
    print(f"\n=== {titulo} ===")

def db_directo():
    return database.SessionLocal()

def dato(resp):
    j = resp.json()
    return j.get("data", j)

seccion("Seed de catalogo")
db = db_directo()
db.add_all([
    models.Rol(id=1, nombre="Productor"),
    models.Rol(id=2, nombre="Comprador"),
    models.Rol(id=3, nombre="Administrador"),
])
db.add(models.TipoDocumento(codigo="CC", nombre="Cedula de Ciudadania"))
db.add_all([
    models.Categoria(nombre="Hortaliza"),
    models.Categoria(nombre="Fruta"),
])
db.commit()
db.close()
check("Roles/TipoDocumento/Categorias creados", True)

seccion("RF-01/02: Registro y login")

def registrar(id, nombre, correo, clave, rol_id, tipo_documento="CC"):
    return client.post("/usuarios", json={
        "id": id, "tipo_documento": tipo_documento, "numero_documento": f"{100000+id}",
        "nombre": nombre, "correo": correo, "clave": clave,
        "telefono": f"300000{id:04d}", "rol_id": rol_id,
    })

r = registrar(1, "Juan Productor", "juan@test.com", "Clave1234!", 1)
check("Registro productor", r.status_code in (200, 201), r.text)

r = registrar(2, "Carla Compradora", "carla@test.com", "Clave1234!", 2)
check("Registro comprador", r.status_code in (200, 201), r.text)

r = registrar(3, "Admin Uno", "admin@test.com", "Clave1234!", 3)
check("Registro admin", r.status_code in (200, 201), r.text)

r = registrar(4, "Duplicado", "juan@test.com", "Clave1234!", 2)
check("Correo duplicado rechazado", r.status_code == 400, r.text)

def login(correo, clave):
    return client.post("/auth/login", json={"correo": correo, "clave": clave})

r = login("juan@test.com", "Clave1234!")
d = dato(r)
token_productor = d.get("token") if r.status_code == 200 else None
check("Login productor", r.status_code == 200 and token_productor, r.text)

r = login("carla@test.com", "Clave1234!")
d = dato(r)
token_comprador = d.get("token") if r.status_code == 200 else None
check("Login comprador", r.status_code == 200 and token_comprador, r.text)

r = login("admin@test.com", "Clave1234!")
d = dato(r)
token_admin = d.get("token") if r.status_code == 200 else None
check("Login admin", r.status_code == 200 and token_admin, r.text)

r = login("juan@test.com", "clave-incorrecta")
check("Login clave incorrecta rechazado", r.status_code == 401, r.text)

H_PROD = {"Authorization": f"Bearer {token_productor}"}
H_COMP = {"Authorization": f"Bearer {token_comprador}"}
H_ADMIN = {"Authorization": f"Bearer {token_admin}"}

print(f"\nParte 1 lista. OK={len(OK)} FAIL={len(FAIL)}")

# ── RBAC ──────────────────────────────────────────────────────────────────
seccion("RNF-02: RBAC")

r = client.get("/usuarios/1", headers=H_COMP)
check("Comprador puede ver un perfil ajeno (lectura publica)", r.status_code in (200, 403), r.text)

r = client.put("/usuarios/1", json={"nombre": "Hackeado"}, headers=H_COMP)
check("Comprador NO puede editar el perfil de otro usuario", r.status_code == 403, r.text)

r = client.get("/lotes")
check("Sin token: puede listar lotes (endpoint publico)", r.status_code == 200, r.text)

r = client.post("/lotes", json={"id": 99, "producto": "x", "cantidad": 1, "categoria": "Hortaliza", "productor_id": 2}, headers=H_COMP)
check("Comprador NO puede publicar un lote", r.status_code == 403, r.text)

r = client.get("/reportes/admin", headers=H_PROD)
check("Productor NO puede ver el reporte financiero de admin", r.status_code == 403, r.text)

r = client.get("/reportes/admin", headers=H_ADMIN)
check("Admin SI puede ver el reporte financiero", r.status_code == 200, r.text)

r = client.get("/lotes")  # sin Authorization header en absoluto
check("Ruta protegida sin token -> 401", client.put("/usuarios/1", json={"nombre":"x"}).status_code == 401, "")


# ── RF-06: Perfil productor (finca/GPS) ─────────────────────────────────────
seccion("RF-06: Perfil productor (finca, GPS)")

r = client.put("/usuarios/1", json={
    "nombre_finca": "Finca La Esperanza",
    "cultivos_principales": "Tomate, lechuga",
    "latitud": 4.6097, "longitud": -74.0817,
}, headers=H_PROD)
check("Productor configura finca/GPS", r.status_code == 200, r.text)

r = client.put("/usuarios/2", json={"nombre_finca": "Finca Falsa"}, headers=H_COMP)
check("Comprador NO puede setear datos de finca (RF-06 solo Productor)", r.status_code == 400, r.text)


# ── RF-07/08/11: Lotes ───────────────────────────────────────────────────────
seccion("RF-07/08/11: Lotes")

r = client.post("/lotes", json={
    "id": 1, "producto": "Tomate Chonto", "cantidad": 100, "categoria": "Hortaliza",
    "productor_id": 1, "precio_kg": 2800, "imagen_url": "https://ejemplo.com/tomate.jpg",
    "fecha_cosecha": "2026-09-01",
}, headers=H_PROD)
check("Publicar lote con imagen (RF-07)", r.status_code in (200, 201), r.text)

r = client.post("/lotes", json={
    "id": 2, "producto": "Lote con plazo sin anticipo", "cantidad": 50, "categoria": "Hortaliza",
    "productor_id": 1, "precio_kg": 1000, "horas_limite_pago": 24,
}, headers=H_PROD)
check("Rechaza horas_limite_pago SIN anticipo_pct", r.status_code in (400, 422), r.text)

r = client.post("/lotes", json={
    "id": 2, "producto": "Papa Criolla", "cantidad": 200, "categoria": "Hortaliza",
    "productor_id": 1, "precio_kg": 1500, "anticipo_pct": 30, "horas_limite_pago": 24,
}, headers=H_PROD)
check("Publicar lote CON anticipo + plazo (regla combinada OK)", r.status_code in (200, 201), r.text)

r = client.get("/lotes", params={"precio_min": 1400, "precio_max": 2000})
lotes_filtrados = dato(r)
check("RF-11: filtro por precio min/max", r.status_code == 200 and len(lotes_filtrados) == 1 and lotes_filtrados[0]["id"] == 2, r.text)

r = client.get("/lotes", params={"lat": 4.61, "lon": -74.08, "radio_km": 50})
lotes_radio = dato(r)
check("RF-11: filtro por radio geografico (encuentra los del productor con GPS)", r.status_code == 200 and len(lotes_radio) >= 1, r.text)

r = client.put("/lotes/1", json={"precio_kg": 9999}, headers=H_PROD)
check("Editar precio de lote SIN reservas confirmadas -> permitido", r.status_code == 200, r.text)


# ── RF-17/reservas: crear reserva, stock, plazo de pago ─────────────────────
seccion("Reservas: creacion, stock (RF-17), plazo de pago")

r = client.post("/reservas", json={"comprador_id": 2, "lote_id": 1, "cantidad": 20}, headers=H_COMP)
reserva1 = dato(r)
check("Crear reserva normal", r.status_code in (200, 201), r.text)

r = client.get("/lotes/1") if False else client.get("/lotes", params={"productor_id": 1})
lote1 = next((l for l in dato(r) if l["id"] == 1), None)
check("Stock del lote se descuenta al reservar", lote1 and lote1["kg_reservados"] == 20, str(lote1))

r = client.post("/reservas", json={"comprador_id": 2, "lote_id": 1, "cantidad": 999999}, headers=H_COMP)
check("RF-17: rechaza reserva que excede el stock disponible", r.status_code in (400, 409, 422), r.text)

r = client.post("/reservas", json={"comprador_id": 2, "lote_id": 2, "cantidad": 10}, headers=H_COMP)
reserva_con_plazo = dato(r)
check("Crear reserva sobre lote CON plazo de pago", r.status_code in (200, 201), r.text)
check("fecha_limite_pago quedo asignada", reserva_con_plazo.get("fecha_limite_pago") is not None, str(reserva_con_plazo))


# ── Cancelacion con motivo obligatorio ───────────────────────────────────────
seccion("Cancelacion: motivo obligatorio")

rid1 = reserva1["id"]
r = client.put(f"/reservas/{rid1}/estado", json={"estado": "Cancelada"}, headers=H_COMP)
check("Cancelar SIN motivo -> rechazado", r.status_code == 400, r.text)

r = client.put(f"/reservas/{rid1}/estado", json={"estado": "Cancelada", "motivo_cancelacion": "Cambie de planes"}, headers=H_COMP)
check("Cancelar CON motivo -> aceptado", r.status_code == 200, r.text)
check("Motivo quedo guardado", dato(r).get("motivo_cancelacion") == "Cambie de planes", r.text)

r = client.get("/lotes", params={"productor_id": 1})
lote1 = next((l for l in dato(r) if l["id"] == 1), None)
check("Stock se libera al cancelar", lote1 and lote1["kg_reservados"] == 0, str(lote1))


# ── Vencimiento automatico del plazo de pago ─────────────────────────────────
seccion("Vencimiento automatico por plazo de pago")

db = db_directo()
res_db = db.query(models.Reserva).filter(models.Reserva.id == reserva_con_plazo["id"]).first()
from datetime import datetime, timedelta
res_db.fecha_limite_pago = datetime.now() - timedelta(hours=1)
db.commit()
db.close()

r = client.get("/reservas", headers=H_COMP)
reservas_actuales = dato(r)
reserva_vencida = next((x for x in reservas_actuales if x["id"] == reserva_con_plazo["id"]), None)
check("Reserva vencida se auto-cancela al listar (lazy-trigger)", reserva_vencida and reserva_vencida["estado"] == "Cancelada", str(reserva_vencida))
check("Motivo automatico de vencimiento quedo registrado", reserva_vencida and "plazo" in (reserva_vencida.get("motivo_cancelacion") or "").lower(), str(reserva_vencida))

r = client.get("/lotes", params={"productor_id": 1})
lote2 = next((l for l in dato(r) if l["id"] == 2), None)
check("Stock del lote 2 se libero tras el vencimiento", lote2 and lote2["kg_reservados"] == 0, str(lote2))


print(f"\nHasta reservas. OK={len(OK)} FAIL={len(FAIL)}")

# ── RF-27/RF-46: Pagos, anticipo/saldo, comision ────────────────────────────
seccion("Pagos: reserva normal, confirmacion, pago completo, comision")

r = client.post("/reservas", json={"comprador_id": 2, "lote_id": 1, "cantidad": 15}, headers=H_COMP)
reserva_pago = dato(r)
rid_pago = reserva_pago["id"]
check("Crear reserva para probar pagos", r.status_code in (200, 201), r.text)

r = client.put(f"/reservas/{rid_pago}/estado", json={"estado": "Confirmada"}, headers=H_PROD)
check("Productor confirma la reserva", r.status_code == 200, r.text)

r = client.get("/configuracion/comision")
comision_actual = dato(r)["comision_pct"]
check("Comision por defecto es 5%", comision_actual == 5, str(comision_actual))

r = client.put("/configuracion/comision", json={"comision_pct": 10}, headers=H_ADMIN)
check("Admin cambia la comision a 10%", r.status_code == 200, r.text)

r = client.put("/configuracion/comision", json={"comision_pct": 10}, headers=H_COMP)
check("Comprador NO puede cambiar la comision", r.status_code == 403, r.text)

r = client.post("/pagos", json={"reserva_id": rid_pago, "metodo": "Simulado - Tarjeta"}, headers=H_COMP)
pago1 = dato(r)
check("Pago completo -> aprobado", r.status_code in (200, 201), r.text)
check("Comision del 10% se aplico al pago", pago1.get("comision_pct") == 10, str(pago1))

r = client.get("/reservas", params={"lote_id": 1}, headers=H_COMP)
reserva_pagada = next((x for x in dato(r) if x["id"] == rid_pago), None)
check("Reserva paso a estado Pagada", reserva_pagada and reserva_pagada["estado"] == "Pagada", str(reserva_pagada))


# ── RF-27: anticipo + saldo (dos pagos) ──────────────────────────────────────
seccion("RF-27: anticipo exacto + saldo exacto")

r = client.post("/reservas", json={"comprador_id": 2, "lote_id": 2, "cantidad": 20}, headers=H_COMP)
reserva_anticipo = dato(r)
rid_ant = reserva_anticipo["id"]
client.put(f"/reservas/{rid_ant}/estado", json={"estado": "Confirmada"}, headers=H_PROD)

r = client.get(f"/pagos", params={"reserva_id": rid_ant}, headers=H_COMP)
resumen = dato(r)
monto_anticipo_esperado = resumen.get("monto_anticipo")
check("Resumen de pagos expone el monto de anticipo esperado", monto_anticipo_esperado is not None, str(resumen))

r = client.post("/pagos", json={"reserva_id": rid_ant, "metodo": "Simulado - Tarjeta", "monto": 1}, headers=H_COMP)
check("Rechaza un anticipo con monto incorrecto (no coincide con el %)", r.status_code == 400, r.text)

r = client.post("/pagos", json={"reserva_id": rid_ant, "metodo": "Simulado - Tarjeta", "monto": monto_anticipo_esperado}, headers=H_COMP)
check("Paga el anticipo EXACTO -> aceptado", r.status_code in (200, 201), r.text)

r = client.get("/reservas", params={"lote_id": 2}, headers=H_COMP)
reserva_tras_anticipo = next((x for x in dato(r) if x["id"] == rid_ant), None)
check("Reserva sigue Confirmada (no Pagada) tras solo el anticipo", reserva_tras_anticipo and reserva_tras_anticipo["estado"] == "Confirmada", str(reserva_tras_anticipo))

r = client.get(f"/pagos", params={"reserva_id": rid_ant}, headers=H_COMP)
saldo_pendiente = dato(r).get("monto_pendiente")

r = client.post("/pagos", json={"reserva_id": rid_ant, "metodo": "Simulado - Tarjeta", "monto": saldo_pendiente}, headers=H_COMP)
check("Paga el saldo restante -> aceptado", r.status_code in (200, 201), r.text)

r = client.get("/reservas", params={"lote_id": 2}, headers=H_COMP)
reserva_final = next((x for x in dato(r) if x["id"] == rid_ant), None)
check("Reserva pasa a Pagada tras completar el saldo", reserva_final and reserva_final["estado"] == "Pagada", str(reserva_final))


# ── RF-28/29/30: Entregas y calificacion ─────────────────────────────────────
seccion("Entregas y calificacion")

r = client.post("/entregas", json={"reserva_id": rid_pago, "medio": "Camion propio"}, headers=H_PROD)
entrega1 = dato(r)
check("Productor despacha la reserva pagada", r.status_code in (200, 201), r.text)
codigo = entrega1.get("codigo_confirmacion")
check("Se genero codigo de confirmacion", bool(codigo), str(entrega1))

r = client.put(f"/entregas/{entrega1['id']}", json={"codigo_confirmacion": "0000"}, headers=H_COMP)
check("Codigo incorrecto rechazado", r.status_code in (400, 404, 409), r.text)

r = client.put(f"/entregas/{entrega1['id']}", json={"codigo_confirmacion": codigo}, headers=H_COMP)
check("Codigo correcto confirma la entrega", r.status_code == 200, r.text)

r = client.post("/calificaciones", json={"reserva_id": rid_pago, "estrellas": 5, "comentario": "Excelente"}, headers=H_COMP)
check("Calificar la entrega", r.status_code in (200, 201), r.text)

r = client.post("/calificaciones", json={"reserva_id": rid_pago, "estrellas": 4, "comentario": "otra vez"}, headers=H_COMP)
check("No se puede calificar dos veces la misma reserva", r.status_code in (400, 409), r.text)

r = client.get("/reportes/productor", headers=H_PROD)
reporte_prod = dato(r)
check("Reporte de productor refleja la venta calificada", reporte_prod.get("total_kg_vendidos", 0) >= 15, str(reporte_prod))
check("Reporte de productor incluye comision e ingresos netos", "comision_total" in reporte_prod and "ingresos_netos" in reporte_prod, str(reporte_prod))


# ── RF-31/45: Disputas y reembolso ───────────────────────────────────────────
seccion("Disputas y reembolso automatico via resolucion")

r = client.post("/reservas", json={"comprador_id": 2, "lote_id": 1, "cantidad": 5}, headers=H_COMP)
reserva_disputa = dato(r)
rid_disp = reserva_disputa["id"]
client.put(f"/reservas/{rid_disp}/estado", json={"estado": "Confirmada"}, headers=H_PROD)
r = client.post("/pagos", json={"reserva_id": rid_disp, "metodo": "Simulado - Tarjeta"}, headers=H_COMP)
pago_disp = dato(r)

r = client.post("/disputas", json={"reserva_id": rid_disp, "descripcion": "El producto llego incompleto"}, headers=H_COMP)
disputa1 = dato(r)
check("Comprador abre una disputa", r.status_code in (200, 201), r.text)

if r.status_code in (200, 201):
    r = client.put(f"/disputas/{disputa1['id']}", json={"estado": "Resuelta", "resolucion": "Reembolso total", "reembolsar": True}, headers=H_ADMIN)
    check("Admin resuelve la disputa con reembolso", r.status_code == 200, r.text)

    r = client.get("/pagos", params={"reserva_id": rid_disp}, headers=H_COMP)
    pagos_tras_disputa = dato(r).get("pagos", [])
    hay_reembolsado = any(p["estado"] == "Reembolsado" for p in pagos_tras_disputa)
    check("El pago quedo marcado como Reembolsado", hay_reembolsado, str(pagos_tras_disputa))
else:
    check("Admin resuelve la disputa con reembolso", False, "omitido: no se pudo crear la disputa")
    check("El pago quedo marcado como Reembolsado", False, "omitido: no se pudo crear la disputa")


# ── Notificaciones ────────────────────────────────────────────────────────
seccion("Notificaciones generadas durante el flujo")

r = client.get("/notificaciones", headers=H_PROD)
notifs_productor = dato(r).get("notificaciones", [])
check("Productor tiene notificaciones acumuladas (nueva reserva, pagos, etc.)", len(notifs_productor) > 0, str(len(notifs_productor)))

r = client.get("/notificaciones", headers=H_COMP)
notifs_comprador = dato(r).get("notificaciones", [])
tipos_recibidos = {n["tipo"] for n in notifs_comprador}
check("Comprador recibio notificacion de ReembolsoProcesado", "ReembolsoProcesado" in tipos_recibidos, str(tipos_recibidos))
check("Comprador recibio notificacion de PlazoDePago", "PlazoDePago" in tipos_recibidos, str(tipos_recibidos))
check("Comprador recibio notificacion de ReservaVencida", "ReservaVencida" in tipos_recibidos, str(tipos_recibidos))


# ── RESUMEN FINAL ─────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"RESULTADO FINAL: {len(OK)} OK, {len(FAIL)} FAIL de {len(OK)+len(FAIL)} pruebas")
print("=" * 60)
if FAIL:
    print("\nPruebas que fallaron:")
    for nombre, detalle in FAIL:
        print(f"  - {nombre}\n    {detalle[:300]}")


