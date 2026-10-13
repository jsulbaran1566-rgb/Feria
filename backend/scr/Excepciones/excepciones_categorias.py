class ErrorCategoriaNoEncontrada(Exception):
    def __init__(self, nombre: str):
        self.mensaje = f"No se encontró la categoría '{nombre}'"


class ErrorCategoriaYaExiste(Exception):
    def __init__(self, nombre: str):
        self.mensaje = f"La categoría '{nombre}' ya existe"


class ErrorCantidadMinNegativa(Exception):
    def __init__(self):
        self.mensaje = "El valor de cantidad_min no puede ser negativo"


class ErrorCategoriaConLotes(Exception):
    def __init__(self, nombre: str, total: int):
        self.mensaje = (
            f"No se puede eliminar la categoría '{nombre}' porque tiene "
            f"{total} lote(s) asociado(s). Reasigne o elimine los lotes primero."
        )