from typing import Optional
from pydantic import BaseModel, field_validator


class CalificacionCrear(BaseModel):
    reserva_id: int
    estrellas: int
    comentario: Optional[str] = None

    @field_validator("reserva_id")
    @classmethod
    def id_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("El reserva_id debe ser un número positivo")
        return v

    @field_validator("estrellas")
    @classmethod
    def estrellas_validas(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Las estrellas deben estar entre 1 y 5")
        return v
