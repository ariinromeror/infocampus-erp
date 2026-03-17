-- Migración idempotente: se puede ejecutar múltiples veces sin error
CREATE TABLE IF NOT EXISTS public.revoked_tokens (
    jti        VARCHAR PRIMARY KEY,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_revoked_at
    ON public.revoked_tokens (revoked_at);

COMMENT ON TABLE public.revoked_tokens IS
    'JWTs revocados. El jti (JWT ID) se inserta al hacer logout.';
