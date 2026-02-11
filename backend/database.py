"""
Conexión a base de datos PostgreSQL
Usando psycopg2 con connection pooling
CORREGIDO para Render deployment
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
from urllib.parse import urlparse
from config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

connection_pool = None

def parse_database_url(url: str) -> dict:
    """
    Parsea DATABASE_URL en componentes individuales
    Render/PostgreSQL usan formato: postgresql://user:pass@host:port/dbname
    """
    result = urlparse(url)
    return {
        'dbname': result.path[1:],
        'user': result.username,
        'password': result.password,
        'host': result.hostname,
        'port': result.port or 5432
    }

def init_connection_pool(min_conn=1, max_conn=10):
    """
    Inicializa el pool de conexiones a PostgreSQL
    CORRECCIÓN: ThreadedConnectionPool requiere parámetros individuales, NO URL directa
    """
    global connection_pool
    try:
        # Parsear la URL en componentes
        db_params = parse_database_url(settings.DATABASE_URL)
        
        # Crear pool con parámetros individuales
        connection_pool = ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            **db_params  # Desempaquetar los parámetros parseados
        )
        logger.info("✅ Pool de conexiones PostgreSQL inicializado")
        logger.info(f"   Host: {db_params['host']}:{db_params['port']}")
        logger.info(f"   Database: {db_params['dbname']}")
    except Exception as e:
        logger.error(f"❌ Error inicializando pool de conexiones: {e}")
        logger.error(f"   DATABASE_URL format: {settings.DATABASE_URL[:30]}...")
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
        # Configurar cursor factory para esta conexión
        conn.cursor_factory = RealDictCursor
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
    db_params = parse_database_url(settings.DATABASE_URL)
    return psycopg2.connect(
        **db_params,
        cursor_factory=RealDictCursor
    )