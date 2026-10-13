from datetime import date
from sqlalchemy import Column, Integer, Numeric, String, Text, Date, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= USUARIOS =================

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('Activo','Inactivo')",
            name="chk_usuarios_estado",
        ),
        CheckConstraint(
            "latitud IS NULL OR latitud BETWEEN -90 AND 90",
            name="chk_usuarios_latitud",
        ),
        CheckConstraint(
            "longitud IS NULL OR longitud BETWEEN -180 AND 180",
            name="chk_usuarios_longitud",
        ),
    )

    id               = Column(Integer, primary_key=True, index=True)
    tipo_documento   = Column(
        String(4),
        ForeignKey("tipos_documento.codigo", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False
    )
    numero_documento = Column(String(30), unique=True, nullable=False)
    nombre           = Column(String(150), nullable=False)
    correo         = Column(String(150), unique=True, nullable=False)
    telefono       = Column(String(20),  unique=True, nullable=False)
    clave          = Column(String(255), nullable=False)
    direccion      = Column(String(200), nullable=True)
    ciudad         = Column(String(100), nullable=True)
    empresa        = Column(String(150), nullable=True)
    rol_id         = Column(Integer,     ForeignKey("roles.id", onupdate="CASCADE", ondelete="RESTRICT"), nullable=False)
    estado         = Column(String(20),  nullable=False, default="Activo")
    fecha_registro = Column(Date,        nullable=False,  default=date.today)

    # RF-05 — Editar perfil (Todos)
    foto_url    = Column(String(300), nullable=True)
    descripcion = Column(Text,        nullable=True)

    # RF-06 — Perfil productor (solo aplica/tiene sentido para rol Productor)
    nombre_finca         = Column(String(150), nullable=True)
    cultivos_principales = Column(String(300), nullable=True)
    latitud              = Column(Numeric(9, 6), nullable=True)
    longitud             = Column(Numeric(9, 6), nullable=True)

    tipo_documento_rel = relationship("TipoDocumento", back_populates="usuarios")
    rol_rel            = relationship("Rol",           back_populates="usuarios")
    lotes    = relationship("Lote",    back_populates="productor")
    ventas   = relationship("Venta",   back_populates="vendedor")
    reservas = relationship("Reserva", back_populates="comprador")
    compras  = relationship("Compra",  back_populates="comprador")
