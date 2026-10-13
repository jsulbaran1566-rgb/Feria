class ErrorSoporteNoEncontrado(Exception):
    def __init__(self, soporte_id: int):
        self.mensaje = f"No se encontró un ticket de soporte con id {soporte_id}"
        super().__init__(self.mensaje)
