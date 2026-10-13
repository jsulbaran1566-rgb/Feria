from pydantic import BaseModel, field_validator


# ================= FAVORITOS =================

class FavoritoCrear(BaseModel):
    comprador_id: int
    productor_id: int

    @field_validator("comprador_id", "productor_id")
    @classmethod
    def ids_positivos(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Los ids deben ser números positivos")
        return v
