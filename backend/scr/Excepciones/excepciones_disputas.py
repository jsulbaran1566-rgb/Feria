class ErrorDisputaNoEncontrada(Exception):
    def __init__(self, disputa_id: int):
        self.mensaje = f"No se encontró una disputa con id {disputa_id}"
        super().__init__(self.mensaje)


class ErrorDisputaYaExiste(Exception):
    def __init__(self, reserva_id: int):
        self.mensaje = f"La reserva {reserva_id} ya tiene una disputa abierta"
        super().__init__(self.mensaje)
