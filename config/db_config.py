import psycopg2
from psycopg2 import pool

DB_CONFIG = {
    'dbname': 'mydb',
    'user': 'sql_developer',
    'password': 'Dev@123',
    'host': '103.14.123.44',
    'port': 5432
}

try:
    connection_pool = psycopg2.pool.SimpleConnectionPool(1, 10, **DB_CONFIG)
    print("✅ Connected to Remote PostgreSQL (103.14.123.44)")
except Exception as e:
    print("❌ Database Connection Error:", str(e))

def get_connection():
    return connection_pool.getconn()

def release_connection(conn):
    connection_pool.putconn(conn)
