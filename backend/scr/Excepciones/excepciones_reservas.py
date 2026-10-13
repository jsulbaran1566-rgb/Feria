class ErrorReservaNoEncontrada(Exception):
    def __init__(self, id: int):
        self.mensaje = f"No se encontró una reserva con id {id}"


class ErrorReservaYaExiste(Exception):
    def __init__(self, id: int):
        self.mensaje = f"Ya existe una reserva con el id {id}"


class ErrorStockInsuficiente(Exception):
    def __init__(self, producto: str, pedido: int, disponible: int):
        self.mensaje = (
            f"Stock insuficiente para '{producto}'. "
            f"Solicitado: {pedido} kg — Disponible: {disponible} kg"
        )


class ErrorProductoNoEncontrado(Exception):
    def __init__(self, producto: str):
        self.mensaje = f"El producto '{producto}' no se encontró en los lotes disponibles"


class ErrorEstadoInvalido(Exception):
    def __init__(self, estado: str, estados_validos: list):
        self.mensaje = f"Estado inválido: '{estado}'. Estados permitidos: {estados_validos}"


class ErrorReservaNoEliminable(Exception):
    def __init__(self, id: int, estado: str):
        self.mensaje = (
            f"La reserva {id} no puede eliminarse porque su estado es '{estado}'. "
            f"Solo se pueden eliminar reservas en estado 'Cancelada'."
        )