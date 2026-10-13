from typing import Optional

from pydantic import BaseModel, field_validator


METODOS_PAGO_VALIDOS = [
    "Simulado - Tarjeta",
    "Simulado - PSE",
    "Simulado - Efectivo",
]

ESTADOS_WEBHOOK_VALIDOS = [
    "Aprobado",
    "Rechazado",
]

RESULTADOS_SIMULADOS_VALIDOS = [
    "aprobado",
    "fallido",
]


class PagoCrear(BaseModel):
    reserva_id: int
    metodo: str

    # RF-27:
    # Si no se manda, se cobra el total pendiente de la reserva
    # de una sola vez. Si se manda con un valor menor, se registra
    # como abono.
    monto: Optional[float] = None

    # Solo para pruebas académicas mientras no exista una pasarela real.
    # En producción este resultado lo determina la pasarela y llega
    # por webhook.
    resultado_simulado: Optional[str] = "aprobado"

    @field_validator("reserva_id")
    @classmethod
    def id_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError(
                "El reserva_id debe ser un número positivo"
            )
        return v

    @field_validator("metodo")
    @classmethod
    def metodo_valido(cls, v: str) -> str:
        if v not in METODOS_PAGO_VALIDOS:
            raise ValueError(
                f"Método inválido. Opciones: {METODOS_PAGO_VALIDOS}"
            )
        return v

    @field_validator("monto")
    @classmethod
    def monto_valido(
        cls,
        v: Optional[float],
    ) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError(
                "El monto debe ser mayor a 0"
            )
        return v

    @field_validator("resultado_simulado")
    @classmethod
    def resultado_valido(
        cls,
        v: Optional[str],
    ) -> Optional[str]:
        if (
            v is not None
            and v not in RESULTADOS_SIMULADOS_VALIDOS
        ):
            raise ValueError(
                "resultado_simulado inválido. "
                f"Opciones: {RESULTADOS_SIMULADOS_VALIDOS}"
            )
        return v


class PagoWebhook(BaseModel):
    # Identificador que entrega la pasarela y que AgroDirecto
    # guarda como referencia_ext al iniciar el pago.
    referencia_ext: str

    estado: str

    # La pasarela puede devolver el monto confirmado.
    # Si viene, se valida contra el monto registrado para evitar
    # confirmar una cantidad distinta.
    monto: Optional[float] = None

    evento_id: Optional[str] = None

    @field_validator("referencia_ext")
    @classmethod
    def referencia_valida(cls, v: str) -> str:
        v = v.strip()

        if not v:
            raise ValueError(
                "La referencia_ext es obligatoria"
            )

        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:

        equivalencias = {
            "approved": "Aprobado",
            "aprobado": "Aprobado",
            "paid": "Aprobado",

            "rejected": "Rechazado",
            "rechazado": "Rechazado",
            "failed": "Rechazado",
            "fallido": "Rechazado",
        }

        normalizado = equivalencias.get(
            v.strip().lower()
        )

        if not normalizado:
            raise ValueError(
                "Estado de webhook inválido. "
                "Usa Aprobado/Rechazado o approved/rejected"
            )

        return normalizado

    @field_validator("monto")
    @classmethod
    def monto_valido(
        cls,
        v: Optional[float],
    ) -> Optional[float]:

        if v is not None and v <= 0:
            raise ValueError(
                "El monto debe ser mayor a 0"
            )

        return v