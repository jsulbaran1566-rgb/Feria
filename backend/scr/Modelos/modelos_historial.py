from datetime import date, datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, CheckConstraint, Numeric
from sqlalchemy.orm import relationship
from Conexion.database import Base


# ================= HISTORIAL SEGUIMIENTO =================

class HistorialSeguimiento(Base):
    __tablename__ = "historial_seguimiento"

    id       = Column(Integer,     primary_key=True, index=True, autoincrement=True)
    accion   = Column(String(200), nullable=False)
    lote     = Column(Integer,     ForeignKey("lotes.id", onupdate="CASCADE", ondelete="SET NULL"), nullable=True)
    producto = Column(String(150), nullable=False)
    fecha    = Column(DateTime,    nullable=False, default=datetime.now)

    lote_rel = relationship("Lote", back_populates="historial")


# ================= COMPRAS =================

class Compra(Base):
    __tablename__ = "compras"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="chk_compras_cant"),
    )

    id           = Column(Integer,       primary_key=True, index=True)
    comprador_id = Column(Integer,       ForeignKey("usuarios.id"),  nullable=False)
    lote_id      = Column(Integer,       ForeignKey("lotes.id"),     nullable=False)
    cantidad     = Column(Integer,       nullable=False)
    fecha        = Column(Date,          nullable=False, default=date.today)
    total        = Column(Numeric(12,2), nullable=True)

    comprador = relationship("Usuario", back_populates="compras")
    lote      = relationship("Lote",      back_populates="compras")


# ================= VENTAS =================

class Venta(Base):
    __tablename__ = "ventas"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="chk_ventas_cant"),
    )

    id          = Column(Integer,       primary_key=True, index=True)
    vendedor_id = Column(Integer,       ForeignKey("usuarios.id"), nullable=False)
    lote_id     = Column(Integer,       ForeignKey("lotes.id"),    nullable=False)
    cantidad    = Column(Integer,       nullable=False)
    fecha       = Column(Date,          nullable=False, default=date.today)
    total       = Column(Numeric(12,2), nullable=True)

    vendedor = relationship("Usuario", back_populates="ventas")
    lote     = relationship("Lote",    back_populates="ventas")


# ================= HISTORIAL RESERVAS =================
# Bitácora: cada vez que cambia el estado de una reserva se inserta un registro.

class HistorialReserva(Base):
    __tablename__ = "historial_reservas"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('Pendiente','Confirmada','Pagada','En tránsito','Entregada','Calificada','Cancelada')",
            name="chk_historial_estado",
        ),
    )

    id         = Column(Integer,  primary_key=True, index=True, autoincrement=True)
    reserva_id = Column(Integer,  ForeignKey("reservas.id", ondelete="CASCADE"), nullable=False)
    estado     = Column(String(20), nullable=False)
    fecha      = Column(DateTime,   nullable=False, default=datetime.now)

    reserva_rel = relationship("Reserva", back_populates="historial_estados")
