# fix_review_routes.py
from flask import Blueprint, jsonify, request, send_from_directory
from config.db_config import get_connection, release_connection
import json
import traceback
import os

fix_review_bp = Blueprint("fix_review_bp", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploaded_docs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"📂 Upload folder set to: {UPLOAD_FOLDER}")

# ---------- Helpers ----------
def safe_json_load(text):
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        # Try to fix single quotes -> double quotes (best-effort), else return {}
        try:
            return json.loads(text.replace("'", '"'))
        except Exception:
            return {}

def deep_find_validation(obj):
    """Look through object and nested stringified JSONs to find ValidationStatus-like object."""
    if not obj or not isinstance(obj, (dict, list)):
        return None
    # If dict and has ValidationStatus or validation key - return it
    if isinstance(obj, dict):
        for k in obj.keys():
            if k and isinstance(k, str) and k.lower() in ("validationstatus", "validation", "validation_status", "validationstatus"):
                candidate = obj.get(k)
                if candidate and isinstance(candidate, dict) and "FailedFields" in candidate:
                    return candidate
        # otherwise search recursively
        for k, v in obj.items():
            if isinstance(v, dict):
                found = deep_find_validation(v)
                if found:
                    return found
            elif isinstance(v, str):
                # try parse
                try:
                    parsed = json.loads(v)
                    found = deep_find_validation(parsed)
                    if found:
                        return found
                except Exception:
                    continue
    elif isinstance(obj, list):
        for item in obj:
            found = deep_find_validation(item)
            if found:
                return found
    return None

# ============================================================== #
# GET single document for human review (returns extracted + validation)
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
            if conn:
                release_connection(conn)
            return jsonify({"status": "error", "message": "Document not found"}), 404

        (
            doc_id,
            file_name,
            extracted_json_text,
            corrected_json_text,
            data_extraction_status,
            erp_entry_status,
            uploaded_on,
            client_name,
            doc_type,
        ) = row

        extracted_json = safe_json_load(extracted_json_text)
        corrected_json = safe_json_load(corrected_json_text)

        # If extracted_json uses wrapper { "final_data": { ... } }, pick that
        extracted_final = extracted_json.get("final_data", extracted_json) if isinstance(extracted_json, dict) else extracted_json
        corrected_final = corrected_json.get("final_data", corrected_json) if isinstance(corrected_json, dict) else corrected_json

        # prefer corrected (if non-empty) else extracted
        display_data = corrected_final if (isinstance(corrected_final, dict) and corrected_final) else extracted_final

        # Find ValidationStatus anywhere: top-level, inside extracted, or inside corrected
        validation_obj = None
        # 1) try corrected top-level
        validation_obj = deep_find_validation(corrected_final) or deep_find_validation(extracted_final) or None

        # Build file_url for iframe preview
        base_url = request.host_url.rstrip("/")
        file_url = f"{base_url}/api/human_review/pdf/{doc_id}"

        # Release DB early
        release_connection(conn)
        conn = None

        # Return: doc + extracted_data + ValidationStatus
        response_data = {
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
            # Note: frontend will decide which keys to show / order
            "extracted_data": display_data if isinstance(display_data, dict) else {},
            "corrected_data": corrected_final if isinstance(corrected_final, dict) else {},
            # Provide ValidationStatus in a key frontend expects
            "ValidationStatus": validation_obj if isinstance(validation_obj, dict) else None,
            # keep raw JSON for debugging if needed
            "raw_extracted": extracted_json
        }

        return jsonify({"status": "success", "data": response_data}), 200

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
# Save the corrected (human-reviewed) data
# ============================================================== #
@fix_review_bp.route("/api/human_review/update_corrected/<int:doc_id>", methods=["POST"])
def update_corrected_json(doc_id):
    conn = None
    try:
        payload = request.get_json(force=True, silent=True)
        if not payload or "corrected_json" not in payload:
            return jsonify({"status": "error", "message": "Missing corrected_json"}), 400

        corrected_json_data = payload["corrected_json"]
        corrected_json_text = json.dumps({"final_data": corrected_json_data}, ensure_ascii=False)

        conn = get_connection()
        cur = conn.cursor()

        update_query = """
            UPDATE doc_processing_log
            SET corrected_json = %s,
                manual_review_status = 'Reviewed',
                erp_entry_status = 'Fixed',
                updated_at = NOW()
            WHERE doc_id = %s
            RETURNING doc_id;
        """
        cur.execute(update_query, (corrected_json_text, doc_id))
        result = cur.fetchone()
        conn.commit()

        if not result:
            release_connection(conn)
            return jsonify({"status": "error", "message": f"No record found for doc_id={doc_id}"}), 404

        release_connection(conn)
        return jsonify({"status": "success", "message": f"Corrected JSON saved for doc_id={doc_id}"}), 200

    except Exception as e:
        print("❌ Exception while saving corrected JSON:", str(e))
        traceback.print_exc()
        if conn:
            release_connection(conn)
        return jsonify({"status": "error", "message": str(e), "traceback": traceback.format_exc()}), 500


# ============================================================== #
# Serve PDF file
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
            release_connection(conn)
            return jsonify({"status": "error", "message": "File not found in database"}), 404

        file_name = row[0]
        pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploaded_docs"))
        file_full_path = os.path.join(pdf_path, file_name)

        release_connection(conn)
        if not os.path.exists(file_full_path):
            return jsonify({"status": "error", "message": f"PDF not found on disk: {file_full_path}"}), 404

        return send_from_directory(pdf_path, file_name)
    except Exception as e:
        print(f"❌ Error loading PDF for doc_id={doc_id}: {str(e)}")
        traceback.print_exc()
        if conn:
            release_connection(conn)
        return jsonify({"status": "error", "message": str(e), "traceback": traceback.format_exc()}), 500
