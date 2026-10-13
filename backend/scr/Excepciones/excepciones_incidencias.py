class ErrorIncidenciaNoEncontrada(Exception):
    def __init__(self, incidencia_id: int):
        self.mensaje = f"No se encontró una incidencia con id {incidencia_id}"
        super().__init__(self.mensaje)
