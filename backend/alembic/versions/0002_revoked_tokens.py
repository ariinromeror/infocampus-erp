"""revoked_tokens (JWT logout / revocacion)

RQ-03 (docs/PRD.md): migra el contenido de
`backend/migrations/001_revoked_tokens.sql` (aplicado hasta ahora por
`main.py` en cada arranque, vía advisory lock) al sistema de migraciones
Alembic. `main.py` deja de ejecutar SQL crudo directamente: ahora corre
`alembic upgrade head` (ver backend/main.py) reutilizando el mismo advisory
lock para coordinar múltiples workers de Gunicorn.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-02

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.revoked_tokens (
            jti        VARCHAR(255) PRIMARY KEY,
            revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_revoked_tokens_revoked_at
            ON public.revoked_tokens (revoked_at)
    """)
    op.execute("""
        COMMENT ON TABLE public.revoked_tokens IS
            'JWTs revocados. El jti (JWT ID) se inserta al hacer logout.'
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.revoked_tokens CASCADE")
