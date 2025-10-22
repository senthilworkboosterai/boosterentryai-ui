from flask import Blueprint, request, jsonify
from config.db_config import get_connection, release_connection
import os
import datetime
from werkzeug.utils import secure_filename
from PIL import Image
import io

upload_bp = Blueprint('upload_bp', __name__)

# Folder for uploaded files
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploaded_docs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"📂 Upload folder is set to: {UPLOAD_FOLDER}")


# ========================================
#1️⃣ Get all clients
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

        # Remove client prefix if present in format name
        if doc_format_name.lower().startswith(client_name.lower()):
            doc_format_name = doc_format_name[len(client_name):].lstrip("_")

        # allowed image extensions
        IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

        # --- Handle file uploads ---
        files = request.files.getlist("files")

        # DEBUG: print how many files arrived and each filename/mimetype
        print("DEBUG: files received count =", len(files))
        for f in files:
            print(" -", getattr(f, "filename", None), getattr(f, "mimetype", None))

        if not files:
            return jsonify({"status": "error", "message": "No files uploaded"}), 400

        uploaded_records = []

        for file in files:
            orig_name = secure_filename(file.filename or "uploaded_file")
            base, ext = os.path.splitext(orig_name)
            ext = ext.lower()

            # build unique name parts
            now = datetime.datetime.now()
            date_str = now.strftime("%Y%m%d")
            time_str = now.strftime("%H%M%S_%f")  # microsecond precision

            # target doc filename prefix
            prefix = f"{client_name}_{doc_type}_{date_str}_{time_str}"

            # If incoming file is an image -> convert to PDF and save with .pdf ext
            if ext in IMAGE_EXTS or (hasattr(file, "mimetype") and file.mimetype.startswith("image/")):
                try:
                    file.stream.seek(0)
                    img = Image.open(file.stream)

                    # Convert to RGB if needed (PDF requires RGB)
                    if img.mode in ("RGBA", "P", "LA") or img.mode != "RGB":
                        img = img.convert("RGB")

                    filename_pdf = f"{prefix}.pdf"
                    file_path = os.path.join(UPLOAD_FOLDER, filename_pdf)

                    # Save image as single-page PDF
                    img.save(file_path, "PDF", resolution=100.0)

                    uploaded_records.append({
                        "file_name": filename_pdf,
                        "saved_path": os.path.abspath(file_path)
                    })
                except Exception as img_err:
                    print(f"❌ Image conversion failed for {orig_name}: {img_err}")
                    # skip this file and continue with others
                    continue

            else:
                # Treat as PDF (or save as-is)
                filename = f"{prefix}{ext if ext else '.pdf'}"
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                try:
                    file.save(file_path)
                    uploaded_records.append({
                        "file_name": filename,
                        "saved_path": os.path.abspath(file_path)
                    })
                except Exception as save_err:
                    print(f"❌ Saving failed for {orig_name}: {save_err}")
                    continue

        print(f"✅ Uploaded {len(uploaded_records)} file(s) to {UPLOAD_FOLDER}/")

        return jsonify({
            "status": "success",
            "message": f"{len(uploaded_records)} file(s) uploaded successfully.",
            "data": uploaded_records
        }), 200

    except Exception as e:
        print("❌ Upload Error:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500
