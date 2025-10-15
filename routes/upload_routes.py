from flask import Blueprint, request, jsonify
from config.db_config import get_connection, release_connection
import os
import datetime

upload_bp = Blueprint('upload_bp', __name__)

# Folder for uploaded files
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploaded_docs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"📂 Upload folder is set to: {UPLOAD_FOLDER}")


# ========================================
# 1️⃣ Get all clients
# ========================================
@upload_bp.route("/api/clients", methods=["GET"])
def get_clients():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT client_id, client_name FROM clients ORDER BY client_name;")
        rows = cur.fetchall()
        release_connection(conn)

        clients = [{"id": r[0], "name": r[1]} for r in rows]
        return jsonify({"status": "success", "data": clients}), 200

    except Exception as e:
        print("❌ Error fetching clients:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500


# ========================================
# 2️⃣ Get document formats for selected client
# ========================================
@upload_bp.route("/api/doc_formats/<int:client_id>", methods=["GET"])
def get_doc_formats(client_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT doc_format_id, doc_type, doc_format_name, file_type
            FROM doc_formats
            WHERE client_id = %s
            ORDER BY doc_format_name;
        """, (client_id,))
        rows = cur.fetchall()
        release_connection(conn)

        formats = [
            {
                "id": r[0],
                "doc_type": r[1],
                "name": r[2],
                "file_type": r[3]
            }
            for r in rows
        ]
        return jsonify({"status": "success", "data": formats}), 200

    except Exception as e:
        print("❌ Error fetching document formats:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500


# ========================================
# 3️⃣ Upload one or multiple files
# ========================================
@upload_bp.route("/api/upload", methods=["POST"])
def upload_files():
    try:
        client_id = request.form.get("client_id")
        doc_format_id = request.form.get("doc_format_id")

        if not client_id or not doc_format_id:
            return jsonify({"status": "error", "message": "Missing client or format ID"}), 400

        # --- Fetch client and format details ---
        conn = get_connection()
        cur = conn.cursor()

        # Get client name
        cur.execute("SELECT client_name FROM clients WHERE client_id = %s;", (client_id,))
        client_name_row = cur.fetchone()
        if not client_name_row:
            release_connection(conn)
            return jsonify({"status": "error", "message": "Invalid client ID"}), 400
        client_name = client_name_row[0].replace(" ", "_")

        # Get document type and format name
        cur.execute("""
            SELECT doc_format_name, doc_type
            FROM doc_formats
            WHERE doc_format_id = %s;
        """, (doc_format_id,))
        doc_info = cur.fetchone()
        release_connection(conn)

        if not doc_info:
            return jsonify({"status": "error", "message": "Invalid format ID"}), 400

        doc_format_name, doc_type = doc_info
        doc_type = doc_type.replace(" ", "_")
        doc_format_name = doc_format_name.replace(" ", "_")

        # --- Remove client prefix if present in format name ---
        if doc_format_name.lower().startswith(client_name.lower()):
            doc_format_name = doc_format_name[len(client_name):].lstrip("_")

        # --- Handle file uploads ---
        files = request.files.getlist("files")
        if not files:
            return jsonify({"status": "error", "message": "No files uploaded"}), 400

        uploaded_records = []

        for file in files:
            safe_filename = file.filename.replace(" ", "_")
            file_ext = os.path.splitext(safe_filename)[1] or ".pdf"

            # ✅ Add microsecond to make each filename unique
            now = datetime.datetime.now()
            date_str = now.strftime("%Y%m%d")
            time_str = now.strftime("%H%M%S_%f")  # microsecond precision

            # ✅ Final naming format
            filename = f"{client_name}_{doc_type}_{date_str}_{time_str}{file_ext}"
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(file_path)

            uploaded_records.append({
                "file_name": filename,
                "saved_path": os.path.abspath(file_path)
            })

        print(f"✅ Uploaded {len(uploaded_records)} file(s) to {UPLOAD_FOLDER}/")

        return jsonify({
            "status": "success",
            "message": f"{len(uploaded_records)} file(s) uploaded successfully.",
            "data": uploaded_records
        }), 200

    except Exception as e:
        print("❌ Upload Error:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500
