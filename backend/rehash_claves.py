# Script de UN SOLO USO — hashea las claves de los usuarios que ya estan
# guardadas en texto plano (por ejemplo, las que trae el .sql de ejemplo).
#
# Como usarlo:
#   1. Ubicate en la carpeta scr:  cd scr
#   2. Ejecuta:                    python ../rehash_claves.py
#
# Es seguro ejecutarlo varias veces: si una clave ya esta hasheada (empieza
# con "$2b$"), el script la deja intacta y no la vuelve a hashear.

import sys
import os

# Permite importar los modulos de la carpeta scr aunque el script este afuera
sys.path.append(os.path.join(os.path.dirname(__file__), "scr"))

from Conexion.database import SessionLocal
import Modelos.models as models
from Utilidades.seguridad import hashear_clave

db = SessionLocal()

usuarios = db.query(models.Usuario).all()
contador = 0

for usuario in usuarios:
    # Los hashes de bcrypt siempre empiezan con "$2b$" (o "$2a$"/"$2y$")
    if not usuario.clave.startswith("$2"):
        print(f"Hasheando clave de: {usuario.correo}")
        usuario.clave = hashear_clave(usuario.clave)
        contador += 1

db.commit()
db.close()

print(f"\nListo. {contador} clave(s) hasheada(s).")