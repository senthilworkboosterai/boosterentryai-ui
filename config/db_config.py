import psycopg
from psycopg_pool import ConnectionPool

DB_CONFIG = {
    'dbname': 'mydb',
    'user': 'sql_developer',
    'password': 'Dev@123',
    'host': '103.14.123.44',
    'port': 5432
}

try:
    # ✅ Create connection pool (psycopg 3+ syntax)
    connection_pool = ConnectionPool(
        conninfo=(
            f"dbname={DB_CONFIG['dbname']} "
            f"user={DB_CONFIG['user']} "
            f"password={DB_CONFIG['password']} "
            f"host={DB_CONFIG['host']} "
            f"port={DB_CONFIG['port']}"
        ),
        min_size=1,
        max_size=10,
    )
    print("✅ Connected to Remote PostgreSQL (103.14.123.44)")
except Exception as e:
    print("❌ Database Connection Error:", str(e))


def get_connection():
    return connection_pool.getconn()


def release_connection(conn):
    connection_pool.putconn(conn)
