from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= NOTIFICACIONES =================
# Cubre RF-33 a RF-38. No hay un scheduler/cron corriendo en este proyecto,
# así que el recordatorio de 48h antes de la entrega (RF-36) NO se dispara
# solo en background — se genera de forma perezosa la primera vez que el
# usuario consulta sus notificaciones y ya está dentro de esa ventana de
# 48h (ver Controladores/controladores_notificaciones.py). Es una
# simplificación honesta, no un cron real.

class Notificacion(Base):
    __tablename__ = "notificaciones"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('NuevaReserva','CambioEstadoCultivo','PagoRecibido',"
            "'RecordatorioEntrega','AlertaIncidencia','ReembolsoProcesado',"
            "'PlazoDePago','ReservaVencida')",
            name="chk_notificaciones_tipo",
        ),
    )

    id            = Column(Integer, primary_key=True, index=True)
    usuario_id    = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo          = Column(String(30), nullable=False)
    mensaje       = Column(Text, nullable=False)
    leida         = Column(Boolean, nullable=False, default=False)
    fecha         = Column(DateTime, nullable=False, default=datetime.now)

    # Referencia opcional a la entidad relacionada (ej. "reserva", 123), para
    # que el frontend pueda enlazar directo a lo que originó la notificación.
    entidad_tipo  = Column(String(30), nullable=True)
    entidad_id    = Column(Integer, nullable=True)

    usuario = relationship("Usuario")
