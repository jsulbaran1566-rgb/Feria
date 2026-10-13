class ErrorNotificacionNoEncontrada(Exception):
    def __init__(self, notificacion_id: int):
        self.mensaje = f"No se encontró una notificación con id {notificacion_id}"
        super().__init__(self.mensaje)
