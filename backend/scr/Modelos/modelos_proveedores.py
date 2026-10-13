from sqlalchemy import Column, Integer, String, CheckConstraint
from Conexion.database import Base


# ================= PROVEEDORES =================

class Proveedor(Base):
    __tablename__ = "proveedores"
    __table_args__ = (
        CheckConstraint("estado IN ('Activo','Inactivo')", name="chk_proveedores_estado"),
    )
    id       = Column(Integer, primary_key=True, index=True)
    nombre   = Column(String(150), nullable=False)
    tipo     = Column(String(50), nullable=False)
    ciudad   = Column(String(100), nullable=True)
    telefono = Column(String(20), nullable=True)
    correo   = Column(String(150), nullable=True)
    estado   = Column(String(20), nullable=False, default="Activo")
