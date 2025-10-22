from flask import Blueprint, request, jsonify
from config.db_config import get_connection, release_connection
from datetime import datetime
import json, traceback

monitoring_bp = Blueprint("monitoring_bp", __name__)

# ✅ API 1: Fetch Monitoring Table Data
@monitoring_bp.route("/api/monitoring", methods=["GET"])
def get_monitoring_data():
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        client_id = request.args.get("client_id")
        status = request.args.get("status")
        from_date = request.args.get("from_date")
        to_date = request.args.get("to_date")

        base_query = """
            SELECT 
                d.doc_id,
                c.client_name,
                f.doc_type,
                d.doc_file_name,
                d.uploaded_on,
                d.overall_status,
                d.data_extraction_status,
                d.erp_entry_status
            FROM doc_processing_log d
            LEFT JOIN clients c ON d.client_id = c.client_id
            LEFT JOIN doc_formats f ON d.doc_format_id = f.doc_format_id
            WHERE 1=1
        """

        filters = []
        params = []

        if client_id:
            filters.append("d.client_id = %s")
            params.append(client_id)

        if status:
            filters.append("d.overall_status ILIKE %s")
            params.append(f"%{status}%")

        if from_date and to_date:
            filters.append("DATE(d.uploaded_on) BETWEEN %s AND %s")
            params.extend([from_date, to_date])

        if filters:
            base_query += " AND " + " AND ".join(filters)

        base_query += " ORDER BY d.uploaded_on DESC;"

        cur.execute(base_query, tuple(params))
        rows = cur.fetchall()

        data = []
        for r in rows:
            uploaded_on = (
                r[4].strftime("%Y-%m-%d %H:%M:%S")
                if isinstance(r[4], datetime)
                else str(r[4])
            )
            data.append({
                "id": r[0],
                "client_name": r[1],
                "doc_type": r[2],
                "file_name": r[3],
                "uploaded_on": uploaded_on,
                "overall_status": r[5],
                "data_extraction_status": r[6],
                "erp_entry_status": r[7],
            })

        release_connection(conn)
        return jsonify({"status": "success", "data": data}), 200

    except Exception as e:
        print("❌ Monitoring Data Error:", str(e))
        traceback.print_exc()
        if conn:
            release_connection(conn)
        return jsonify({"status": "error", "message": str(e)}), 500


# ✅ API 2: Fetch Single Document Details (PDF + Extracted JSON)
@monitoring_bp.route("/api/monitoring/<int:doc_id>", methods=["GET"])
def get_monitoring_doc_details(doc_id):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        query = """
            SELECT 
                d.doc_id,
                c.client_name,
                f.doc_type,
                d.doc_file_name,
                d.extracted_json,
                d.corrected_json,
                d.uploaded_on,
                d.data_extraction_status,
                d.erp_entry_status
            FROM doc_processing_log d
            LEFT JOIN clients c ON d.client_id = c.client_id
            LEFT JOIN doc_formats f ON d.doc_format_id = f.doc_format_id
            WHERE d.doc_id = %s
        """
        cur.execute(query, (doc_id,))
        row = cur.fetchone()

        if not row:
            release_connection(conn)
            return jsonify({"status": "error", "message": "Document not found"}), 404

        (
            doc_id,
            client_name,
            doc_type,
            file_name,
            extracted_json,
            corrected_json,
            uploaded_on,
            data_extraction_status,
            erp_entry_status
        ) = row

        def parse_json(data):
            if not data:
                return {}
            try:
                return json.loads(data)
            except Exception:
                return {}

        extracted_data = parse_json(extracted_json)
        corrected_data = parse_json(corrected_json)

        display_data = corrected_data or extracted_data
        if "final_data" in display_data:
            display_data = display_data["final_data"]

        base_url = request.host_url.rstrip("/")
        if base_url.endswith("/app"):
            base_url = base_url[:-4]  # remove '/app'
        pdf_url = f"{base_url}/uploaded_docs/{file_name}"
        release_connection(conn)

        return jsonify({
            "status": "success",
            "data": {
                "doc": {
                    "id": doc_id,
                    "client_name": client_name,
                    "doc_type": doc_type,
                    "uploaded_on": str(uploaded_on),
                    "file_url": pdf_url,
                    "data_extraction_status": data_extraction_status,
                    "erp_entry_status": erp_entry_status
                },
                "extracted_data": display_data
            }
        }), 200

    except Exception as e:
        print("❌ Monitoring Doc Fetch Error:", str(e))
        traceback.print_exc()
        if conn:
            release_connection(conn)
        return jsonify({"status": "error", "message": str(e)}), 500
