from datetime import date
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator

# Orden fijo del ciclo de vida del cultivo (RF-13). Se usa tanto para validar
# el valor como para verificar que solo se avance hacia adelante.
ESTADOS_CULTIVO_VALIDOS = ["Siembra", "Crecimiento", "Listo", "Cosechado"]


# ================= LOTES =================

class LoteCrear(BaseModel):
    producto: str
    cantidad: int
    categoria: str
    productor_id: int
    estado: str = "Activo"
    fecha_siembra: Optional[date] = None
    fecha_cosecha: Optional[date] = None
    precio_kg: Optional[float] = None
    imagen_url: Optional[str] = None  # RF-07
    anticipo_pct: Optional[int] = None  # RF-27: % de anticipo, NULL = pago completo
    horas_limite_pago: Optional[int] = None  # plazo para pagar el anticipo, requiere anticipo_pct

    @field_validator("productor_id")
    @classmethod
    def ids_positivos(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Los ids deben ser números positivos")
        return v

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ("Activo", "Inactivo"):
            raise ValueError("El estado debe ser 'Activo' o 'Inactivo'")
        return v

    @field_validator("precio_kg")
    @classmethod
    def precio_positivo(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("El precio por kg no puede ser negativo")
        return v

    @field_validator("anticipo_pct")
    @classmethod
    def anticipo_valido(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 99):
            raise ValueError("El anticipo debe ser un porcentaje entre 1 y 99")
        return v

    @field_validator("horas_limite_pago")
    @classmethod
    def horas_limite_valida(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Las horas límite deben ser mayores a 0")
        return v

    @model_validator(mode="after")
    def horas_limite_requiere_anticipo(self):
        if self.horas_limite_pago is not None and self.anticipo_pct is None:
            raise ValueError(
                "Para poner un plazo límite de pago, primero hay que configurar el % de anticipo de este lote"
            )
        return self


class LoteEditar(BaseModel):
    producto:      Optional[str]   = None
    cantidad:      Optional[int]   = None
    categoria:     Optional[str]   = None
    estado:        Optional[str]   = None
    precio_kg:     Optional[float] = None
    imagen_url:    Optional[str]   = None  # RF-07
    fecha_siembra: Optional[date]  = None
    fecha_cosecha: Optional[date]  = None
    anticipo_pct:  Optional[int]   = None
    horas_limite_pago: Optional[int] = None

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("Activo", "Inactivo"):
            raise ValueError("El estado debe ser 'Activo' o 'Inactivo'")
        return v

    @field_validator("precio_kg")
    @classmethod
    def precio_positivo(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("El precio por kg no puede ser negativo")
        return v

    @field_validator("anticipo_pct")
    @classmethod
    def anticipo_valido(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 99):
            raise ValueError("El anticipo debe ser un porcentaje entre 1 y 99")
        return v

    @field_validator("horas_limite_pago")
    @classmethod
    def horas_limite_valida(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Las horas límite deben ser mayores a 0")
        return v


# ── RF-13: avanzar el estado del cultivo (Siembra → Crecimiento → Listo → Cosechado) ──

class EstadoCultivoActualizar(BaseModel):
    estado_cultivo: str

    @field_validator("estado_cultivo")
    @classmethod
    def estado_cultivo_valido(cls, v: str) -> str:
        if v not in ESTADOS_CULTIVO_VALIDOS:
            raise ValueError(f"Estado inválido. Opciones: {ESTADOS_CULTIVO_VALIDOS}")
        return v
