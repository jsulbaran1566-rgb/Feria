class ErrorLoteNoEncontrado(Exception):
    def __init__(self, id: int):
        self.mensaje = f"No se encontró un lote con el id {id}"


class ErrorLoteYaExiste(Exception):
    def __init__(self, id: int):
        self.mensaje = f"Ya existe un lote con el id {id}"


class ErrorCantidadInvalida(Exception):
    def __init__(self):
        self.mensaje = "La cantidad debe ser mayor a 0"


class ErrorCategoriaInvalidaEnLote(Exception):
    def __init__(self, categoria: str):
        self.mensaje = f"La categoría '{categoria}' no existe en el sistema"
