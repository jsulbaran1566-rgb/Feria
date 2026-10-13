"""
Logging centralizado del backend. Reemplaza los `print()` sueltos por logs
reales, con nivel, timestamp, y persistencia en archivo (además de consola)
para poder revisar qué pasó después de que ocurrió — algo que un `print()`
no te da una vez se cierra la terminal.

Uso en cualquier archivo:
    from Utilidades.logger import logger
    logger.info("Mensaje")
    logger.warning("Algo raro pero no fatal")
    logger.error("Algo falló")
    logger.exception("Algo falló y quiero el traceback completo")  # dentro de un except
"""

import logging
import os

CARPETA_LOGS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(CARPETA_LOGS, exist_ok=True)

logger = logging.getLogger("agrodirecto")
logger.setLevel(logging.INFO)

_formato = logging.Formatter(
    fmt="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Consola (igual que antes con print, pero con nivel y timestamp)
_handler_consola = logging.StreamHandler()
_handler_consola.setFormatter(_formato)

# Archivo — para poder revisar después de cerrar la terminal.
_handler_archivo = logging.FileHandler(
    os.path.join(CARPETA_LOGS, "backend.log"), encoding="utf-8"
)
_handler_archivo.setFormatter(_formato)

if not logger.handlers:
    logger.addHandler(_handler_consola)
    logger.addHandler(_handler_archivo)
