#!/usr/bin/env python3
"""
regenerar_hashes.py
===================
Ejecuta este script UNA VEZ si los usuarios demo tardan en hacer login.

DIAGNÓSTICO PREVIO:
    Conecta a Supabase SQL Editor y ejecuta:
        SELECT email, SUBSTRING(password_hash, 1, 7) AS rounds
        FROM public.usuarios
        WHERE email LIKE '%infocampus.edu.es%';

    Si ves $2b$12$ → los hashes son lentos (rounds=12 → ~8-15s en Render free).
    Si ves $2b$04$ → los hashes son rápidos (rounds=4  → ~25ms). No necesitas este script.

USO:
    pip install psycopg2-binary passlib[bcrypt]
    python regenerar_hashes.py

    O directamente desde scripts_db/ donde ya tienes el .env:
    cd scripts_db && python ../regenerar_hashes.py
"""
import os
import sys
import warnings
warnings.filterwarnings("ignore", message=".*bcrypt.*")

try:
    import psycopg2
    import psycopg2.extras
    from passlib.context import CryptContext
    from dotenv import load_dotenv
except ImportError as e:
    print(f"[ERROR] {e}")
    print("Instala con: pip install psycopg2-binary passlib[bcrypt] python-dotenv")
    sys.exit(1)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("[ERROR] Variable DATABASE_URL no encontrada. Revisa tu .env")
    sys.exit(1)

# rounds=12 — mismo valor que auth.py y populate.py en producción endurecida
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

UNIVERSAL_PASSWORD = "campus2026"

# Emails de los usuarios demo que deben tener hash rápido
DEMO_EMAILS = [
    "director@infocampus.edu.es",
    "tesorero@infocampus.edu.es",
    "coordinador@infocampus.edu.es",
    "profesor@infocampus.edu.es",
    "estudiante@infocampus.edu.es",
]

def main():
    print(f"Conectando a BD...")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    cur = conn.cursor()

    # Verificar rounds actuales
    cur.execute("""
        SELECT email, SUBSTRING(password_hash, 1, 7) AS rounds_info
        FROM public.usuarios
        WHERE email = ANY(%s)
    """, (DEMO_EMAILS,))
    rows = cur.fetchall()

    print("\nEstado actual de los hashes:")
    print(f"{'EMAIL':<45} {'ROUNDS'}")
    print("-" * 55)
    for r in rows:
        print(f"{r['email']:<45} {r['rounds_info']}")

    needs_regen = any(r['rounds_info'] != '$2b$04' for r in rows)

    if not needs_regen:
        print("\n✅ Todos los hashes ya están en rounds=4. No se necesita regenerar.")
        cur.close()
        conn.close()
        return

    print(f"\n⚠️  Detectados hashes con rounds != 4. Regenerando con rounds=4...")
    nuevo_hash = pwd_ctx.hash(UNIVERSAL_PASSWORD)
    print(f"   Nuevo hash: {nuevo_hash[:20]}...")

    cur.execute("""
        UPDATE public.usuarios
        SET password_hash = %s
        WHERE email = ANY(%s)
    """, (nuevo_hash, DEMO_EMAILS))

    affected = cur.rowcount
    conn.commit()

    print(f"\n✅ {affected} usuarios actualizados con hash rounds=4.")
    print("   El login ahora tardará ~25ms en lugar de ~8-15 segundos.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
