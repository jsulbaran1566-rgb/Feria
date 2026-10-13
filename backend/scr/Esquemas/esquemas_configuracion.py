from pydantic import BaseModel, field_validator


class ComisionActualizar(BaseModel):
    comision_pct: int

    @field_validator("comision_pct")
    @classmethod
    def rango_valido(cls, v: int) -> int:
        if not (0 <= v <= 100):
            raise ValueError("La comisión debe estar entre 0 y 100")
        return v
