from fastapi import Depends
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Utilidades.respuesta import respuesta_ok
from Esquemas.Esquemas import ComisionActualizar
from Dependencias.dependencias import requiere_rol


def obtener_configuracion(db: Session) -> models.ConfiguracionPlataforma:
    """
    Devuelve la fila única de configuración, creándola con el valor por
    defecto (5%) si todavía no existe — así no hace falta un seed manual
    para que el sistema funcione desde el primer arranque.
    """
    config = db.query(models.ConfiguracionPlataforma).filter(models.ConfiguracionPlataforma.id == 1).first()
    if not config:
        config = models.ConfiguracionPlataforma(id=1, comision_pct=5)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


# ── GET /configuracion/comision ───────────────────────────────────────────────
# Público: el Productor debería poder ver qué % le cobra la plataforma antes
# de publicar un lote, no solo el Administrador.

def ver_comision(db: Session = Depends(get_db)):
    config = obtener_configuracion(db)
    return respuesta_ok(
        message="Comisión de la plataforma obtenida correctamente",
        data={"comision_pct": config.comision_pct},
    )


# ── PUT /configuracion/comision ───────────────────────────────────────────────
# Solo Administrador puede cambiar el porcentaje.

def actualizar_comision(
    datos: ComisionActualizar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Administrador")),
):
    config = obtener_configuracion(db)
    config.comision_pct = datos.comision_pct
    db.commit()

    return respuesta_ok(
        message=f"Comisión actualizada a {datos.comision_pct}%. Se aplicará a los pagos nuevos (los ya hechos no cambian).",
        data={"comision_pct": config.comision_pct},
    )
