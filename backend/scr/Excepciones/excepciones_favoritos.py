class ErrorFavoritoYaExiste(Exception):
    def __init__(self, comprador_id: int, productor_id: int):
        self.mensaje = f"El productor {productor_id} ya está en los favoritos del comprador {comprador_id}"
        super().__init__(self.mensaje)


class ErrorFavoritoNoEncontrado(Exception):
    def __init__(self, comprador_id: int, productor_id: int):
        self.mensaje = f"No se encontró un favorito entre el comprador {comprador_id} y el productor {productor_id}"
        super().__init__(self.mensaje)