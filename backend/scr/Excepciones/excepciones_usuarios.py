class ErrorUsuarioNoExiste(Exception):
    def __init__(self, id):
        self.mensaje = f"No existe un usuario con el id {id}"


class ErrorUsuarioYaExiste(Exception):
    def __init__(self, id):
        self.mensaje = f"Ya existe un usuario con el id {id}"


class ErrorRolInvalido(Exception):
    def __init__(self, rol: str, roles_validos: list):
        self.mensaje = f"Rol inválido: '{rol}'. Roles permitidos: {roles_validos}"
