from typing import Optional
from pydantic import BaseModel, field_validator

ESTADOS_DISPUTA_VALIDOS = ["Abierta", "En revisión", "Resuelta", "Cerrada"]


class DisputaCrear(BaseModel):
    reserva_id: int
    descripcion: str

    @field_validator("reserva_id")
    @classmethod
    def id_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("El reserva_id debe ser un número positivo")
        return v

    @field_validator("descripcion")
    @classmethod
    def descripcion_no_vacia(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("La descripción no puede estar vacía")
        return v.strip()


class DisputaActualizar(BaseModel):
    estado: str
    resolucion: Optional[str] = None
    reembolsar: bool = False  # RF-25/38: si True, marca el pago de la reserva como Reembolsado y notifica al comprador

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ESTADOS_DISPUTA_VALIDOS:
            raise ValueError(f"Estado inválido. Opciones: {ESTADOS_DISPUTA_VALIDOS}")
        return v
