from datetime import date
from typing import Optional
from pydantic import BaseModel, field_validator


# ================= RESERVAS =================
# NOTA: ReservaCrear ya no recibe "id" — lo calcula el backend con
# _siguiente_id() en el controlador. Antes el frontend mandaba un id
# tipo Date.now() (timestamp en ms), que desbordaba la columna INTEGER
# de PostgreSQL (NumericValueOutOfRange).

class ReservaCrear(BaseModel):
    comprador_id: int
    lote_id: int
    cantidad: int

    @field_validator("comprador_id", "lote_id")
    @classmethod
    def ids_positivos(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Los ids deben ser números positivos")
        return v

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v: int) -> int:
        if v < 1:
            raise ValueError("La cantidad mínima a reservar es 1")
        return v


class ReservaEditar(BaseModel):
    comprador_id: Optional[int]  = None
    fecha:        Optional[date] = None
    estado:       Optional[str]  = None
    motivo_cancelacion: Optional[str] = None  # obligatorio cuando estado == "Cancelada" (se valida en el controlador)

    @field_validator("comprador_id")
    @classmethod
    def comprador_positivo(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("El comprador_id debe ser un número positivo")
        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: Optional[str]) -> Optional[str]:
        estados = ["Pendiente", "Confirmada", "Pagada", "En tránsito", "Entregada", "Calificada", "Cancelada"]
        if v is not None and v not in estados:
            raise ValueError(f"Estado inválido. Opciones: {estados}")
        return v
