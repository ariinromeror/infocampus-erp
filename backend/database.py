"""
Conexión a base de datos PostgreSQL
Usando psycopg2 con connection pooling
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
from .config import settings
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Connection Pool Global
connection_pool = None

def init_connection_pool(min_conn=1, max_conn=10):
    """
    Inicializa el pool de conexiones a PostgreSQL
    """
    global connection_pool
    try:
        connection_pool = ThreadedConnectionPool(
            min_conn,
            max_conn,
            settings.DATABASE_URL,
            cursor_factory=RealDictCursor
        )
        logger.info("✅ Pool de conexiones PostgreSQL inicializado")
    except Exception as e:
        logger.error(f"❌ Error inicializando pool de conexiones: {e}")
        raise

@contextmanager
def get_db():
    """
    Context manager para obtener conexión a la base de datos
    
    Uso:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM usuarios")
            results = cur.fetchall()
    """
    global connection_pool
    
    if connection_pool is None:
        init_connection_pool()
    
    conn = None
    try:
        conn = connection_pool.getconn()
        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"❌ Error en transacción de base de datos: {e}")
        raise
    finally:
        if conn:
            connection_pool.putconn(conn)

def get_db_direct():
    """
    Obtiene una conexión directa (sin pool) - para casos especiales
    """
    return psycopg2.connect(
        settings.DATABASE_URL,
        cursor_factory=RealDictCursor
    )
