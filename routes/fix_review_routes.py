from flask import Blueprint, jsonify, request, send_from_directory
from config.db_config import get_connection, release_connection
import json
import traceback
import os

fix_review_bp = Blueprint("fix_review_bp", __name__)

# ✅ Define absolute upload folder path
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploaded_docs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"📂 Upload folder set to: {UPLOAD_FOLDER}")

ENVIRONMENT = "LOCAL"

# ============================================================== #
# 1️⃣ Load extracted data for human review
# ============================================================== #
@fix_review_bp.route("/api/human_review/<int:doc_id>", methods=["GET"])
def get_human_review_doc(doc_id):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        query = """
            SELECT 
                d.doc_id,
                d.doc_file_name,
                d.extracted_json,
                d.corrected_json,
                d.data_extraction_status,
                d.erp_entry_status,
                d.uploaded_on,
                c.client_name,
                f.doc_type
            FROM doc_processing_log d
            LEFT JOIN clients c ON d.client_id = c.client_id
            LEFT JOIN doc_formats f ON d.doc_format_id = f.doc_format_id
            WHERE d.doc_id = %s
        """
        cur.execute(query, (doc_id,))
        row = cur.fetchone()

        if not row:
            return jsonify({"status": "error", "message": "Document not found"}), 404

        (
            doc_id,
            file_name,
            extracted_json,
            corrected_json,
            data_extraction_status,
            erp_entry_status,
            uploaded_on,
            client_name,
            doc_type,
        ) = row

        # ✅ Parse JSON safely
        def parse_json(text):
            try:
                return json.loads(text) if text else {}
            except Exception:
                return {}

        extracted_data = parse_json(extracted_json)
        corrected_data = parse_json(corrected_json)

        # ✅ Dynamically build correct file URL (for React iframe)
        base_url = request.host_url.rstrip("/")  # e.g. http://127.0.0.1:5050
        file_url = f"{base_url}/api/human_review/pdf/{doc_id}"
        print(f"📄 File URL generated for doc_id={doc_id}: {file_url}")

        data = {
            "doc": {
                "id": doc_id,
                "client_name": client_name,
                "doc_type": doc_type,
                "uploaded_on": uploaded_on.strftime("%b %d, %I:%M %p") if uploaded_on else None,
                "data_extraction_status": data_extraction_status,
                "erp_entry_status": erp_entry_status,
                "file_name": file_name,
                "file_url": file_url,
            },
            "extracted_data": extracted_data.get("final_data", extracted_data),
            "corrected_data": corrected_data.get("final_data", corrected_data),
        }

        release_connection(conn)
        return jsonify({"status": "success", "data": data}), 200

    except Exception as e:
        print("❌ Error loading FixReview doc:", str(e))
        traceback.print_exc()
        if conn:
            release_connection(conn)
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


# ============================================================== #
# 2️⃣ Save the corrected (human-reviewed) data
# ============================================================== #
@fix_review_bp.route("/api/human_review/update_corrected/<int:doc_id>", methods=["POST"])
def update_corrected_json(doc_id):
    conn = None
    try:
        # Get JSON data from frontend
        payload = request.get_json(force=True, silent=True)
        print(f"\n🟢 Received request for update_corrected_json | doc_id={doc_id}")

        # Validate incoming data
        if not payload or "corrected_json" not in payload:
            print("⚠️ Missing corrected_json key in request!")
            return jsonify({"status": "error", "message": "Missing corrected_json"}), 400

        corrected_json_data = payload["corrected_json"]

        # Convert dict -> JSON text
        corrected_json = json.dumps({"final_data": corrected_json_data}, ensure_ascii=False, indent=2)
        print("🧾 Prepared corrected JSON:")
        print(corrected_json[:200])  # Print first 200 chars

        # Connect to PostgreSQL
        conn = get_connection()
        cur = conn.cursor()

        # Execute update
        update_query = """
            UPDATE doc_processing_log
            SET corrected_json = %s,
                manual_review_status = 'Reviewed',
                erp_entry_status = 'Fixed',
                updated_at = NOW()
            WHERE doc_id = %s
            RETURNING doc_id;
        """
        cur.execute(update_query, (corrected_json, doc_id))
        result = cur.fetchone()

        # Commit transaction
        conn.commit()

        # ✅ Confirm update
        if not result:
            print(f"❌ No matching record found for doc_id={doc_id}")
            release_connection(conn)
            return jsonify({"status": "error", "message": f"No record found for doc_id={doc_id}"}), 404

        print(f"✅ Corrected JSON successfully updated for doc_id={doc_id}")

        # Optional verification: fetch back from DB
        cur.execute("SELECT corrected_json FROM doc_processing_log WHERE doc_id = %s", (doc_id,))
        updated_value = cur.fetchone()
        print("🔍 DB now contains corrected_json:", updated_value[0][:200] if updated_value and updated_value[0] else "NULL")

        release_connection(conn)
        return jsonify({
            "status": "success",
            "message": f"Corrected JSON saved for doc_id={doc_id}"
        }), 200

    except Exception as e:
        print("❌ Exception while saving corrected JSON:", str(e))
        traceback.print_exc()
        if conn:
            release_connection(conn)
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


# ============================================================== #
# 3️⃣ Serve the PDF file for preview
# ============================================================== #
# ============================================================== #
# 3️⃣ Serve the PDF file for preview
# ============================================================== #
@fix_review_bp.route("/api/human_review/pdf/<int:doc_id>", methods=["GET"])
def serve_pdf(doc_id):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT doc_file_name FROM doc_processing_log WHERE doc_id = %s", (doc_id,))
        row = cur.fetchone()

        if not row:
            print(f"❌ No DB record found for doc_id={doc_id}")
            if conn:
                release_connection(conn)
            return jsonify({"status": "error", "message": "File not found in database"}), 404

        file_name = row[0]

        # Resolve uploaded_docs folder relative to this file (routes/)
        pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploaded_docs"))

        # *** IMPORTANT: define file_full_path BEFORE using it in prints/checks ***
        file_full_path = os.path.join(pdf_path, file_name)

        # Debug info (will appear in Flask terminal)
        print("\n------------------------------")
        print(f"🔍 Looking for file: {file_name}")
        print(f"📂 Checking full path: {file_full_path}")
        print("------------------------------\n")

        # Close DB connection as we don't need it anymore
        if conn:
            release_connection(conn)
            conn = None

        # Check if file exists
        if not os.path.exists(file_full_path):
            print("❌ File not found at the above path!")
            return jsonify({
                "status": "error",
                "message": f"PDF not found on disk: {file_full_path}"
            }), 404

        print(f"✅ Found file, serving: {file_name}")
        return send_from_directory(pdf_path, file_name)

    except Exception as e:
        print(f"❌ Error loading PDF for doc_id={doc_id}: {str(e)}")
        traceback.print_exc()
        if conn:
            release_connection(conn)
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500
