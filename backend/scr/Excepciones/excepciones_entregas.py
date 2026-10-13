class ErrorEntregaNoEncontrada(Exception):
    def __init__(self, entrega_id: int):
        self.mensaje = f"No se encontró una entrega con id {entrega_id}"
        super().__init__(self.mensaje)


class ErrorReservaNoEnviable(Exception):
    def __init__(self, estado_actual: str):
        self.mensaje = (
            f"No se puede despachar una reserva en estado '{estado_actual}'. "
            f"La reserva debe estar 'Pagada'."
        )
        super().__init__(self.mensaje)


class ErrorEntregaYaExiste(Exception):
    def __init__(self, reserva_id: int):
        self.mensaje = f"La reserva {reserva_id} ya tiene una entrega registrada"
        super().__init__(self.mensaje)


class ErrorCodigoConfirmacionInvalido(Exception):
    def __init__(self):
        self.mensaje = "El código de confirmación no coincide"
        super().__init__(self.mensaje)
