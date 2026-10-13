"""
Script de migración de esquema — AgroDirecto

`Base.metadata.create_all()` (usado en main.py) SOLO crea tablas que no
existen; nunca modifica columnas ni constraints de tablas que ya están
creadas. Este script cubre ese hueco: sincroniza la base de datos con
todos los cambios de esquema hechos hasta ahora (RBAC, Pagos, Entregas,
Calificaciones, Disputas, RF-05/06, trazabilidad de Lote).

Es IDEMPOTENTE: se puede correr las veces que sea necesario sin duplicar
columnas ni romper datos existentes (usa IF NOT EXISTS / DROP+ADD en
constraints). No borra ni modifica filas existentes.

Uso (desde backend/, con el venv activado):
    cd scr
    python ../migracion_esquema.py
"""

import sys
import os

# Permite importar los modulos de la carpeta scr aunque el script este afuera
sys.path.append(os.path.join(os.path.dirname(__file__), "scr"))

from sqlalchemy import text
from Conexion.database import engine


# Cada tupla es (descripción para el log, sentencia SQL).
PASOS = [
    # ── Usuarios: RF-05 (foto/descripción) y RF-06 (perfil productor) ──────
    ("usuarios.foto_url",
     "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url VARCHAR(300)"),
    ("usuarios.descripcion",
     "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS descripcion TEXT"),
    ("usuarios.nombre_finca",
     "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre_finca VARCHAR(150)"),
    ("usuarios.cultivos_principales",
     "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cultivos_principales VARCHAR(300)"),
    ("usuarios.latitud",
     "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS latitud NUMERIC(9,6)"),
    ("usuarios.longitud",
     "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS longitud NUMERIC(9,6)"),
    ("usuarios.chk_latitud",
     """ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS chk_usuarios_latitud;
        ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_latitud
        CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90)"""),
    ("usuarios.chk_longitud",
     """ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS chk_usuarios_longitud;
        ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_longitud
        CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180)"""),

    # ── Lotes: RF-13 trazabilidad del cultivo ───────────────────────────────
    ("lotes.fecha_siembra",
     "ALTER TABLE lotes ADD COLUMN IF NOT EXISTS fecha_siembra DATE"),
    ("lotes.estado_cultivo",
     "ALTER TABLE lotes ADD COLUMN IF NOT EXISTS estado_cultivo VARCHAR(20) NOT NULL DEFAULT 'Siembra'"),
    ("lotes.chk_estado_cultivo",
     """ALTER TABLE lotes DROP CONSTRAINT IF EXISTS chk_lote_estado_cultivo;
        ALTER TABLE lotes ADD CONSTRAINT chk_lote_estado_cultivo
        CHECK (estado_cultivo IN ('Siembra','Crecimiento','Listo','Cosechado'))"""),

    # ── Lotes: anticipo configurable por el productor (RF-27) ──────────────
    ("lotes.anticipo_pct",
     "ALTER TABLE lotes ADD COLUMN IF NOT EXISTS anticipo_pct INTEGER"),
    ("lotes.chk_anticipo_pct",
     """ALTER TABLE lotes DROP CONSTRAINT IF EXISTS chk_lote_anticipo_pct;
        ALTER TABLE lotes ADD CONSTRAINT chk_lote_anticipo_pct
        CHECK (anticipo_pct IS NULL OR anticipo_pct BETWEEN 1 AND 99)"""),

    # ── Lotes: imagen del lote (RF-07) ──────────────────────────────────────
    ("lotes.imagen_url",
     "ALTER TABLE lotes ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(300)"),

    # ── Lotes: plazo límite para pagar el anticipo ──────────────────────────
    ("lotes.horas_limite_pago",
     "ALTER TABLE lotes ADD COLUMN IF NOT EXISTS horas_limite_pago INTEGER"),
    ("lotes.chk_horas_limite",
     """ALTER TABLE lotes DROP CONSTRAINT IF EXISTS chk_lote_horas_limite;
        ALTER TABLE lotes ADD CONSTRAINT chk_lote_horas_limite
        CHECK (horas_limite_pago IS NULL OR horas_limite_pago > 0)"""),
    ("lotes.chk_horas_requiere_anticipo",
     """ALTER TABLE lotes DROP CONSTRAINT IF EXISTS chk_lote_horas_requiere_anticipo;
        ALTER TABLE lotes ADD CONSTRAINT chk_lote_horas_requiere_anticipo
        CHECK (horas_limite_pago IS NULL OR anticipo_pct IS NOT NULL)"""),

    # ── Reservas: motivo de cancelación + plazo límite de pago ──────────────
    ("reservas.motivo_cancelacion",
     "ALTER TABLE reservas ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT"),
    ("reservas.fecha_limite_pago",
     "ALTER TABLE reservas ADD COLUMN IF NOT EXISTS fecha_limite_pago TIMESTAMP"),

    # ── Reservas: ciclo de vida extendido (Pagada, En tránsito, Calificada) ─
    ("reservas.chk_estado",
     """ALTER TABLE reservas DROP CONSTRAINT IF EXISTS chk_reserva_estado;
        ALTER TABLE reservas ADD CONSTRAINT chk_reserva_estado
        CHECK (estado IN ('Pendiente','Confirmada','Pagada','En tránsito','Entregada','Calificada','Cancelada'))"""),

    # ── Historial de reservas: mismo ciclo de vida extendido ────────────────
    ("historial_reservas.chk_estado",
     """ALTER TABLE historial_reservas DROP CONSTRAINT IF EXISTS chk_historial_estado;
        ALTER TABLE historial_reservas ADD CONSTRAINT chk_historial_estado
        CHECK (estado IN ('Pendiente','Confirmada','Pagada','En tránsito','Entregada','Calificada','Cancelada'))"""),

    # ── Pagos (nueva tabla) ──────────────────────────────────────────────────
    ("tabla pagos",
     """CREATE TABLE IF NOT EXISTS pagos (
            id              INTEGER PRIMARY KEY,
            reserva_id      INTEGER NOT NULL REFERENCES reservas(id) ON DELETE RESTRICT,
            subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
            costo_envio     NUMERIC(10,2) NOT NULL DEFAULT 0,
            monto           NUMERIC(10,2) NOT NULL CHECK (monto > 0),
            estado          VARCHAR(20) NOT NULL DEFAULT 'Aprobado'
                            CHECK (estado IN ('Pendiente','Aprobado','Rechazado')),
            referencia_ext  VARCHAR(50),
            metodo          VARCHAR(30) NOT NULL
                            CHECK (metodo IN ('Simulado - Tarjeta','Simulado - PSE','Simulado - Efectivo')),
            fecha           TIMESTAMP NOT NULL DEFAULT NOW()
        )"""),

    # ── Pagos: desglose subtotal + costo de envío (RF-21) ───────────────────
    ("pagos.subtotal",
     "ALTER TABLE pagos ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0"),
    ("pagos.costo_envio",
     "ALTER TABLE pagos ADD COLUMN IF NOT EXISTS costo_envio NUMERIC(10,2) NOT NULL DEFAULT 0"),
    ("pagos.backfill_subtotal",
     # Para pagos ya existentes (creados antes de este cambio), asumimos
     # que todo el monto era subtotal y el envío quedó en 0 — es lo más
     # honesto que se puede hacer sin inventar un valor de envío retroactivo.
     "UPDATE pagos SET subtotal = monto WHERE subtotal = 0 AND costo_envio = 0"),
    ("pagos.chk_estado_reembolsado",
     """ALTER TABLE pagos DROP CONSTRAINT IF EXISTS chk_pagos_estado;
        ALTER TABLE pagos ADD CONSTRAINT chk_pagos_estado
        CHECK (estado IN ('Pendiente','Aprobado','Rechazado','Reembolsado'))"""),

    # ── Entregas (nueva tabla) ───────────────────────────────────────────────
    ("tabla entregas",
     """CREATE TABLE IF NOT EXISTS entregas (
            id                  INTEGER PRIMARY KEY,
            reserva_id          INTEGER NOT NULL UNIQUE REFERENCES reservas(id) ON DELETE RESTRICT,
            medio               VARCHAR(100) NOT NULL,
            codigo_confirmacion VARCHAR(10) NOT NULL,
            estado              VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
                                CHECK (estado IN ('Pendiente','En tránsito','Entregada')),
            fecha_estimada      DATE,
            fecha_real          DATE
        )"""),

    # ── Calificaciones (nueva tabla) ─────────────────────────────────────────
    ("tabla calificaciones",
     """CREATE TABLE IF NOT EXISTS calificaciones (
            id           INTEGER PRIMARY KEY,
            reserva_id   INTEGER NOT NULL UNIQUE REFERENCES reservas(id) ON DELETE RESTRICT,
            comprador_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
            productor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
            estrellas    INTEGER NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
            comentario   TEXT,
            fecha        DATE NOT NULL DEFAULT CURRENT_DATE
        )"""),

    # ── Disputas (nueva tabla) ────────────────────────────────────────────────
    ("tabla disputas",
     """CREATE TABLE IF NOT EXISTS disputas (
            id                INTEGER PRIMARY KEY,
            reserva_id        INTEGER NOT NULL UNIQUE REFERENCES reservas(id) ON DELETE RESTRICT,
            comprador_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
            estado            VARCHAR(20) NOT NULL DEFAULT 'Abierta'
                              CHECK (estado IN ('Abierta','En revisión','Resuelta','Cerrada')),
            descripcion       TEXT NOT NULL,
            resolucion        TEXT,
            fecha_apertura    DATE NOT NULL DEFAULT CURRENT_DATE,
            fecha_resolucion  DATE
        )"""),

    # ── Entregas: ubicación actual del envío (RF-32, reportada a mano) ──────
    ("entregas.latitud_actual",
     "ALTER TABLE entregas ADD COLUMN IF NOT EXISTS latitud_actual NUMERIC(9,6)"),
    ("entregas.longitud_actual",
     "ALTER TABLE entregas ADD COLUMN IF NOT EXISTS longitud_actual NUMERIC(9,6)"),
    ("entregas.ubicacion_actualizada",
     "ALTER TABLE entregas ADD COLUMN IF NOT EXISTS ubicacion_actualizada TIMESTAMP"),
    ("entregas.chk_latitud",
     """ALTER TABLE entregas DROP CONSTRAINT IF EXISTS chk_entregas_latitud;
        ALTER TABLE entregas ADD CONSTRAINT chk_entregas_latitud
        CHECK (latitud_actual IS NULL OR latitud_actual BETWEEN -90 AND 90)"""),
    ("entregas.chk_longitud",
     """ALTER TABLE entregas DROP CONSTRAINT IF EXISTS chk_entregas_longitud;
        ALTER TABLE entregas ADD CONSTRAINT chk_entregas_longitud
        CHECK (longitud_actual IS NULL OR longitud_actual BETWEEN -180 AND 180)"""),

    # ── Notificaciones (nueva tabla) ──────────────────────────────────────────
    ("tabla notificaciones",
     """CREATE TABLE IF NOT EXISTS notificaciones (
            id            INTEGER PRIMARY KEY,
            usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            tipo          VARCHAR(30) NOT NULL
                          CHECK (tipo IN ('NuevaReserva','CambioEstadoCultivo','PagoRecibido',
                                          'RecordatorioEntrega','AlertaIncidencia','ReembolsoProcesado')),
            mensaje       TEXT NOT NULL,
            leida         BOOLEAN NOT NULL DEFAULT FALSE,
            fecha         TIMESTAMP NOT NULL DEFAULT NOW(),
            entidad_tipo  VARCHAR(30),
            entidad_id    INTEGER
        )"""),

    # Nuevos tipos de notificación (plazo de pago, reserva vencida) —
    # separado del CREATE TABLE de arriba porque esa tabla ya existía en
    # instalaciones previas con el CHECK viejo; en una instalación nueva
    # este paso es redundante pero inofensivo (dispara sobre la misma tabla
    # recién creada).
    ("notificaciones.chk_tipo_plazo",
     """ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS chk_notificaciones_tipo;
        ALTER TABLE notificaciones ADD CONSTRAINT chk_notificaciones_tipo
        CHECK (tipo IN ('NuevaReserva','CambioEstadoCultivo','PagoRecibido',
        'RecordatorioEntrega','AlertaIncidencia','ReembolsoProcesado',
        'PlazoDePago','ReservaVencida'))"""),

    # ── Incidencias (nueva tabla) ─────────────────────────────────────────────
    ("tabla incidencias",
     """CREATE TABLE IF NOT EXISTS incidencias (
            id          INTEGER PRIMARY KEY,
            lote_id     INTEGER NOT NULL REFERENCES lotes(id) ON DELETE RESTRICT,
            tipo        VARCHAR(20) NOT NULL
                        CHECK (tipo IN ('Plaga','Helada','Sequía','Inundación','Otro')),
            descripcion TEXT NOT NULL,
            fecha       DATE NOT NULL DEFAULT CURRENT_DATE
        )"""),

    # ── Configuración de la plataforma (RF-46, tabla singleton) ─────────────
    ("tabla configuracion_plataforma",
     """CREATE TABLE IF NOT EXISTS configuracion_plataforma (
            id           INTEGER PRIMARY KEY DEFAULT 1,
            comision_pct INTEGER NOT NULL DEFAULT 5,
            CONSTRAINT chk_configuracion_singleton CHECK (id = 1),
            CONSTRAINT chk_configuracion_comision CHECK (comision_pct BETWEEN 0 AND 100)
        )"""),
    ("configuracion_plataforma.seed",
     """INSERT INTO configuracion_plataforma (id, comision_pct)
        VALUES (1, 5)
        ON CONFLICT (id) DO NOTHING"""),

    # ── Pagos: comisión de la plataforma sobre cada transacción (RF-46) ─────
    ("pagos.tipo",
     "ALTER TABLE pagos ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'Completo'"),
    ("pagos.chk_tipo",
     """ALTER TABLE pagos DROP CONSTRAINT IF EXISTS chk_pagos_tipo;
        ALTER TABLE pagos ADD CONSTRAINT chk_pagos_tipo
        CHECK (tipo IN ('Completo','Anticipo','Saldo'))"""),
    ("pagos.comision_pct",
     "ALTER TABLE pagos ADD COLUMN IF NOT EXISTS comision_pct INTEGER NOT NULL DEFAULT 0"),
    ("pagos.comision_monto",
     "ALTER TABLE pagos ADD COLUMN IF NOT EXISTS comision_monto NUMERIC(10,2) NOT NULL DEFAULT 0"),
    ("pagos.monto_neto",
     "ALTER TABLE pagos ADD COLUMN IF NOT EXISTS monto_neto NUMERIC(10,2) NOT NULL DEFAULT 0"),
    ("pagos.backfill_monto_neto",
     # Para pagos ya existentes (creados antes de este cambio, sin comisión
     # calculada), asumimos comisión 0 y neto = monto — es lo más honesto
     # que se puede hacer sin inventar una comisión retroactiva.
     "UPDATE pagos SET monto_neto = monto WHERE monto_neto = 0 AND comision_monto = 0"),
]


def ejecutar_migracion():
    print(f"Conectando a: {engine.url}\n")
    exitosos, fallidos = 0, 0

    with engine.connect() as conexion:
        for descripcion, sql in PASOS:
            try:
                # Cada paso en su propia transacción: si uno falla, no
                # arrastra al resto.
                with conexion.begin():
                    for sentencia in sql.split(";"):
                        sentencia = sentencia.strip()
                        if sentencia:
                            conexion.execute(text(sentencia))
                print(f"  ✅ {descripcion}")
                exitosos += 1
            except Exception as error:
                print(f"  ❌ {descripcion} — {error}")
                fallidos += 1

    print(f"\n{exitosos} paso(s) aplicados, {fallidos} fallido(s).")
    if fallidos:
        print("Revisa los errores arriba — probablemente indican que ese paso ya estaba aplicado o hay datos incompatibles.")


if __name__ == "__main__":
    ejecutar_migracion()
