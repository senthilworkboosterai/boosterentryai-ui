from flask import Blueprint, jsonify, request, send_from_directory
from config.db_config import get_connection, release_connection
import json
import traceback
import os

fix_review_bp = Blueprint("fix_review_bp", __name__)

UPLOAD_FOLDER = "uploaded_docs"
ENVIRONMENT = "LOCAL"

# ==============================================================
# 1️⃣ Load extracted data for human review
# ==============================================================
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

        # Parse JSON safely
        def parse_json(text):
            try:
                return json.loads(text) if text else {}
            except Exception:
                return {}

        extracted_data = parse_json(extracted_json)
        corrected_data = parse_json(corrected_json)

        file_url = f"http://127.0.0.1:5050/api/human_review/pdf/{doc_id}"

        data = {
            "doc": {
                "id": doc_id,
                "client_name": client_name,
                "doc_type": doc_type,
                "uploaded_on": uploaded_on.strftime("%b %d, %I:%M %p")
                if uploaded_on
                else None,
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
        return (
            jsonify(
                {"status": "error", "message": str(e), "traceback": traceback.format_exc()}
            ),
            500,
        )

# ==============================================================
# 2️⃣ Save the corrected (human-reviewed) data
# ==============================================================
@fix_review_bp.route("/api/human_review/update_corrected/<int:doc_id>", methods=["POST"])
def update_corrected_json(doc_id):
    conn = None
    try:
        payload = request.json
        if not payload or "corrected_json" not in payload:
            return jsonify({"status": "error", "message": "Missing corrected_json"}), 400

        corrected_json = json.dumps(
            {"final_data": payload["corrected_json"]}, ensure_ascii=False
        )

        conn = get_connection()
        cur = conn.cursor()

        update_query = """
            UPDATE doc_processing_log
            SET corrected_json = %s,
                manual_review_status = 'Reviewed',
                updated_at = NOW()
            WHERE doc_id = %s
        """
        cur.execute(update_query, (corrected_json, doc_id))
        conn.commit()

        release_connection(conn)
        return jsonify({"status": "success", "message": "Corrected JSON saved"}), 200

    except Exception as e:
        print("❌ Error saving corrected JSON:", str(e))
        traceback.print_exc()
        if conn:
            release_connection(conn)
        return (
            jsonify(
                {"status": "error", "message": str(e), "traceback": traceback.format_exc()}
            ),
            500,
        )

# ==============================================================
# 3️⃣ Serve the PDF file for preview
# ==============================================================
@fix_review_bp.route("/api/human_review/pdf/<int:doc_id>", methods=["GET"])
def serve_pdf(doc_id):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT doc_file_name FROM doc_processing_log WHERE doc_id = %s", (doc_id,))
        row = cur.fetchone()

        if not row:
            return jsonify({"status": "error", "message": "File not found"}), 404

        file_name = row[0]
        pdf_path = os.path.join(os.getcwd(), UPLOAD_FOLDER)

        if not os.path.exists(os.path.join(pdf_path, file_name)):
            return jsonify({"status": "error", "message": "PDF not found on disk"}), 404

        release_connection(conn)
        return send_from_directory(pdf_path, file_name)

    except Exception as e:
        print("❌ Error loading PDF:", str(e))
        traceback.print_exc()
        if conn:
            release_connection(conn)
        return (
            jsonify({"status": "error", "message": str(e)}),
            500,
        )
