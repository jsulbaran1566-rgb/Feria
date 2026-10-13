from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= PAGOS =================
# El modelo conserva la trazabilidad de cada intento de pago. Los estados
# Pendiente/Rechazado permiten manejar confirmaciones asíncronas y reintentos;
# la confirmación definitiva de una pasarela externa se procesa mediante
# POST /pagos/webhook. Mientras no haya una pasarela contratada, /pagos puede
# seguir usando el modo simulado para las pruebas del proyecto.

class Pago(Base):
    __tablename__ = "pagos"
    __table_args__ = (
        CheckConstraint("monto > 0", name="chk_pagos_monto"),
        CheckConstraint(
            "estado IN ('Pendiente','Aprobado','Rechazado','Reembolsado')",
            name="chk_pagos_estado",
        ),
        CheckConstraint(
            "metodo IN ('Simulado - Tarjeta','Simulado - PSE','Simulado - Efectivo')",
            name="chk_pagos_metodo",
        ),
        CheckConstraint(
            "tipo IN ('Completo','Anticipo','Saldo')",
            name="chk_pagos_tipo",
        ),
    )

    id            = Column(Integer, primary_key=True, index=True)
    reserva_id    = Column(Integer, ForeignKey("reservas.id", ondelete="RESTRICT"), nullable=False)
    subtotal      = Column(Numeric(10, 2), nullable=False)   # cantidad × precio_kg
    costo_envio   = Column(Numeric(10, 2), nullable=False, default=0)
    monto         = Column(Numeric(10, 2), nullable=False)   # subtotal + costo_envio
    estado        = Column(String(20), nullable=False, default="Aprobado")
    # RF-27: 'Completo' = pago único de siempre. 'Anticipo'/'Saldo' = cuando
    # el lote tiene anticipo_pct configurado, son las dos partes del pago.
    tipo          = Column(String(20), nullable=False, default="Completo")
    referencia_ext = Column(String(50), nullable=True)
    metodo        = Column(String(30), nullable=False)
    fecha         = Column(DateTime, nullable=False, default=datetime.now)

    # RF-46: comisión de la plataforma sobre esta transacción. Se guarda el
    # % vigente en el momento del pago (snapshot) y el monto ya calculado,
    # para que si el Admin cambia la comisión después, los pagos viejos no
    # cambien de valor retroactivamente — cada transacción queda con la
    # comisión que realmente se le aplicó.
    comision_pct   = Column(Integer, nullable=False, default=0)
    comision_monto = Column(Numeric(10, 2), nullable=False, default=0)
    monto_neto     = Column(Numeric(10, 2), nullable=False, default=0)  # lo que recibe el productor

    reserva = relationship("Reserva", backref="pagos")
