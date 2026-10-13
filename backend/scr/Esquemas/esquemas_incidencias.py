from pydantic import BaseModel, field_validator

TIPOS_INCIDENCIA_VALIDOS = ["Plaga", "Helada", "Sequía", "Inundación", "Otro"]


class IncidenciaCrear(BaseModel):
    lote_id: int
    tipo: str
    descripcion: str

    @field_validator("lote_id")
    @classmethod
    def id_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("El lote_id debe ser un número positivo")
        return v

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in TIPOS_INCIDENCIA_VALIDOS:
            raise ValueError(f"Tipo inválido. Opciones: {TIPOS_INCIDENCIA_VALIDOS}")
        return v

    @field_validator("descripcion")
    @classmethod
    def descripcion_no_vacia(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("La descripción no puede estar vacía")
        return v.strip()
