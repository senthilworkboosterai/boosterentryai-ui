# routes/login_route.py
# -------------------------------------------------------------------
# Validates credentials against the `users` table:
#   id (int), email (varchar), password (varchar), created_at (timestamp)
# Supports plaintext and bcrypt-hashed passwords.
# POST /api/login  body: { "email": "...", "password": "..." }
# 200 -> { status:"success", user:{ id, email } }
# 401 -> { status:"error", message:"Invalid email or password" }
# 400 -> { status:"error", message:"Missing email or password" }
# -------------------------------------------------------------------

from flask import Blueprint, request, jsonify
from config.db_config import get_connection, release_connection
import bcrypt  # ok even if your passwords are plaintext; we detect hash format

login_bp = Blueprint("login_bp", __name__)

def _is_probably_bcrypt(value: str) -> bool:
    return isinstance(value, str) and (
        value.startswith("$2a$") or value.startswith("$2b$") or value.startswith("$2y$")
    )

@login_bp.route("/api/login", methods=["POST"])
def login():
    conn = None
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip()
        password = (data.get("password") or "")

        if not email or not password:
            return jsonify({"status": "error", "message": "Missing email or password"}), 400

        conn = get_connection()
        cur = conn.cursor()

        # Schema-qualified to avoid search_path surprises
        cur.execute(
            """
            SELECT id, email, password
            FROM users
            WHERE LOWER(email) = LOWER(%s)
            LIMIT 1;
            """,
            (email,),
        )
        row = cur.fetchone()

        if not row:
            release_connection(conn)
            return jsonify({"status": "error", "message": "Invalid email or password"}), 401

        user_id, user_email, stored_password = row

        # Verify password (bcrypt or plaintext fallback)
        if stored_password and _is_probably_bcrypt(stored_password):
            try:
                valid = bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8"))
            except Exception:
                valid = False
        else:
            # plaintext fallback for your current DB
            valid = (stored_password == password)

        if not valid:
            release_connection(conn)
            return jsonify({"status": "error", "message": "Invalid email or password"}), 401

        release_connection(conn)
        return jsonify({"status": "success", "user": {"id": user_id, "email": user_email}}), 200

    except Exception as e:
        print("❌ Login API Error:", str(e))
        if conn:
            try: release_connection(conn)
            except Exception: pass
        return jsonify({"status": "error", "message": str(e)}), 500
