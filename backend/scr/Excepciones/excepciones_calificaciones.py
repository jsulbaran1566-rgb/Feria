class ErrorCalificacionNoEncontrada(Exception):
    def __init__(self, calificacion_id: int):
        self.mensaje = f"No se encontró una calificación con id {calificacion_id}"
        super().__init__(self.mensaje)


class ErrorCalificacionYaExiste(Exception):
    def __init__(self, reserva_id: int):
        self.mensaje = f"La reserva {reserva_id} ya fue calificada"
        super().__init__(self.mensaje)


class ErrorReservaNoCalificable(Exception):
    def __init__(self, estado_actual: str):
        self.mensaje = (
            f"No se puede calificar una reserva en estado '{estado_actual}'. "
            f"La reserva debe estar 'Entregada'."
        )
        super().__init__(self.mensaje)
