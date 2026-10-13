from datetime import date
from typing import Optional
from pydantic import BaseModel, field_validator

ESTADOS_ENTREGA_VALIDOS = ["Pendiente", "En tránsito", "Entregada"]


class EntregaCrear(BaseModel):
    reserva_id: int
    medio: str
    fecha_estimada: Optional[date] = None

    @field_validator("reserva_id")
    @classmethod
    def id_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("El reserva_id debe ser un número positivo")
        return v

    @field_validator("medio")
    @classmethod
    def medio_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El medio de entrega no puede estar vacío")
        return v.strip()


class EntregaActualizar(BaseModel):
    estado: Optional[str] = None
    codigo_confirmacion: Optional[str] = None  # el comprador lo manda para confirmar recepción

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ESTADOS_ENTREGA_VALIDOS:
            raise ValueError(f"Estado inválido. Opciones: {ESTADOS_ENTREGA_VALIDOS}")
        return v


# RF-32: el Productor reporta manualmente dónde va el envío mientras está
# "En tránsito" (no hay integración con transportista real).
class UbicacionActualizar(BaseModel):
    latitud: float
    longitud: float

    @field_validator("latitud")
    @classmethod
    def latitud_valida(cls, v: float) -> float:
        if not (-90 <= v <= 90):
            raise ValueError("La latitud debe estar entre -90 y 90")
        return v

    @field_validator("longitud")
    @classmethod
    def longitud_valida(cls, v: float) -> float:
        if not (-180 <= v <= 180):
            raise ValueError("La longitud debe estar entre -180 y 180")
        return v
