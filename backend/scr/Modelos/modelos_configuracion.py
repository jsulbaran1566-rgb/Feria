from sqlalchemy import Column, Integer, CheckConstraint
from Conexion.database import Base


# ================= CONFIGURACION_PLATAFORMA =================
# RF-46: comisión que la plataforma cobra sobre cada transacción exitosa.
# Tabla "singleton": siempre existe una única fila con id=1. No hace falta
# más que eso — es una configuración global, no por productor ni por lote.

class ConfiguracionPlataforma(Base):
    __tablename__ = "configuracion_plataforma"
    __table_args__ = (
        CheckConstraint("id = 1", name="chk_configuracion_singleton"),
        CheckConstraint("comision_pct BETWEEN 0 AND 100", name="chk_configuracion_comision"),
    )

    id           = Column(Integer, primary_key=True, default=1)
    comision_pct = Column(Integer, nullable=False, default=5)
