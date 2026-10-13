"""baseline - esquema ya existente en la BD

Revision ID: be0f5201fe69
Revises:
Create Date: 2026-07-15 22:02:18.225982

Esta migración es intencionalmente vacía (no crea ni cambia nada). Es el
punto de partida para empezar a usar Alembic sobre una base de datos que
ya existe y ya fue puesta al día con `python migracion_esquema.py`.

Uso (una sola vez, después de correr migracion_esquema.py):
    alembic stamp head

Eso le dice a Alembic "la BD ya está en este punto, no hay nada que
aplicar" sin ejecutar SQL. De ahí en adelante, cualquier cambio nuevo en
los modelos se agrega con:
    alembic revision --autogenerate -m "descripción del cambio"
    alembic upgrade head
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be0f5201fe69'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema. Vacío a propósito — ver docstring del módulo."""
    pass


def downgrade() -> None:
    """Downgrade schema. Vacío a propósito — ver docstring del módulo."""
    pass
