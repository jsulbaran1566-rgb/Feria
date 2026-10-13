class ErrorPagoNoEncontrado(Exception):
    def __init__(self, pago_id: int):
        self.mensaje = f"No se encontró un pago con id {pago_id}"
        super().__init__(self.mensaje)


class ErrorReservaNoPagable(Exception):
    def __init__(self, estado_actual: str):
        self.mensaje = (
            f"No se puede pagar una reserva en estado '{estado_actual}'. "
            f"La reserva debe estar 'Confirmada'."
        )
        super().__init__(self.mensaje)
