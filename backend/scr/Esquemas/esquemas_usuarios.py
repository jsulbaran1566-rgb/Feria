from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

from Utilidades.validacion_clave import validar_clave_segura


# ================= USUARIOS =================

TIPOS_DOCUMENTO_VALIDOS = ["CC", "NIT", "CE", "PP"]
ROLES_VALIDOS   = ["Administrador", "Productor", "Comprador"]
ESTADOS_VALIDOS = ["Activo", "Inactivo"]


class UsuarioCrear(BaseModel):
    id:                int
    tipo_documento:    str
    numero_documento:  str
    nombre:            str
    correo:            EmailStr
    telefono:          str
    clave:             str
    direccion:         Optional[str] = None
    ciudad:            Optional[str] = None
    empresa:           Optional[str] = None
    rol_id:            int
    estado:            str = "Activo"

    @field_validator("id")
    @classmethod
    def id_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("El id debe ser un número positivo")
        return v

    @field_validator("numero_documento")
    @classmethod
    def numero_documento_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El número de documento no puede estar vacío")
        return v.strip()

    @field_validator("tipo_documento")
    @classmethod
    def tipo_doc_valido(cls, v: str) -> str:
        if v not in TIPOS_DOCUMENTO_VALIDOS:
            raise ValueError(f"Tipo de documento inválido. Opciones: {TIPOS_DOCUMENTO_VALIDOS}")
        return v

    @field_validator("rol_id")
    @classmethod
    def rol_id_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("El rol_id debe ser un número positivo")
        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ESTADOS_VALIDOS:
            raise ValueError(f"Estado inválido. Opciones: {ESTADOS_VALIDOS}")
        return v

    @field_validator("clave")
    @classmethod
    def clave_segura(cls, v: str) -> str:
        return validar_clave_segura(v)


class UsuarioEditar(BaseModel):
    tipo_documento: Optional[str]      = None
    nombre:         Optional[str]      = None
    correo:         Optional[EmailStr] = None
    telefono:       Optional[str]      = None
    clave:          Optional[str]      = None
    direccion:      Optional[str]      = None
    ciudad:         Optional[str]      = None
    rol_id:         Optional[int]      = None
    estado:         Optional[str]      = None

    # RF-05 — Editar perfil (Todos)
    foto_url:    Optional[str] = None
    descripcion: Optional[str] = None

    # RF-06 — Perfil productor
    nombre_finca:         Optional[str]   = None
    cultivos_principales: Optional[str]   = None
    latitud:              Optional[float] = None
    longitud:              Optional[float] = None

    @field_validator("clave")
    @classmethod
    def clave_segura(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validar_clave_segura(v)

    @field_validator("latitud")
    @classmethod
    def latitud_valida(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("La latitud debe estar entre -90 y 90")
        return v

    @field_validator("longitud")
    @classmethod
    def longitud_valida(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("La longitud debe estar entre -180 y 180")
        return v

    @field_validator("tipo_documento")
    @classmethod
    def tipo_doc_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in TIPOS_DOCUMENTO_VALIDOS:
            raise ValueError(f"Tipo de documento inválido. Opciones: {TIPOS_DOCUMENTO_VALIDOS}")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip() if v else v

    @field_validator("telefono")
    @classmethod
    def telefono_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("El teléfono no puede estar vacío")
        return v.strip() if v else v

    @field_validator("rol_id")
    @classmethod
    def rol_id_positivo(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("El rol_id debe ser un número positivo")
        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ESTADOS_VALIDOS:
            raise ValueError(f"Estado inválido. Opciones: {ESTADOS_VALIDOS}")
        return v
