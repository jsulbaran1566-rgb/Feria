class ErrorCredencialesInvalidas(Exception):
    def __init__(self):
        self.mensaje = "Correo o contraseña incorrectos, o cuenta inactiva"


class ErrorTokenInvalido(Exception):
    def __init__(self):
        self.mensaje = "Token ausente, inválido o expirado. Inicia sesión nuevamente."


class ErrorNoAutorizado(Exception):
    def __init__(self, roles_permitidos: list[str]):
        self.mensaje = (
            f"No tienes permiso para realizar esta acción. "
            f"Roles permitidos: {', '.join(roles_permitidos)}."
        )


class ErrorTokenRecuperacionInvalido(Exception):
    def __init__(self):
        self.mensaje = "El enlace de recuperación es inválido o ya expiró. Solicita uno nuevo."