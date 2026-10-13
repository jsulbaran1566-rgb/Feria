class ErrorProveedorNoEncontrado(Exception):
    def __init__(self, id: int):
        self.mensaje = f"No se encontró el proveedor con id {id}"


class ErrorProveedorYaExiste(Exception):
    def __init__(self, nombre: str):
        self.mensaje = f"El proveedor '{nombre}' ya existe"
