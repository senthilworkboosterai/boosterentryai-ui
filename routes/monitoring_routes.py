from flask import Blueprint, request, jsonify
from config.db_config import get_connection, release_connection
import datetime

monitoring_bp = Blueprint('monitoring_bp', __name__)

@monitoring_bp.route("/api/monitoring", methods=["GET"])
def get_monitoring_data():
    try:
        client_id = request.args.get("client_id")
        status = request.args.get("status")
        from_date = request.args.get("from_date")
        to_date = request.args.get("to_date")

        conn = get_connection()
        cur = conn.cursor()

        # Base query with joins
        query = """
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
            JOIN clients c ON d.client_id = c.client_id
            JOIN doc_formats f ON d.doc_format_id = f.doc_format_id
            WHERE 1=1
        """
        params = []

        # Apply filters dynamically
        if client_id:
            query += " AND d.client_id = %s"
            params.append(client_id)

        if status:
            query += " AND d.overall_status ILIKE %s"
            params.append(f"%{status}%")

        if from_date and to_date:
            query += " AND DATE(d.uploaded_on) BETWEEN %s AND %s"
            params.extend([from_date, to_date])
        elif from_date:
            query += " AND DATE(d.uploaded_on) >= %s"
            params.append(from_date)
        elif to_date:
            query += " AND DATE(d.uploaded_on) <= %s"
            params.append(to_date)

        query += " ORDER BY d.uploaded_on DESC;"

        cur.execute(query, tuple(params))
        rows = cur.fetchall()

        release_connection(conn)

        data = []
        for row in rows:
            data.append({
                "id": row[0],
                "client_name": row[1],
                "doc_type": row[2],
                "file_name": row[3],
                "uploaded_on": row[4].strftime("%Y-%m-%d %H:%M:%S"),
                "overall_status": row[5],
                "data_extraction_status": row[6],
                "erp_entry_status": row[7],
            })

        return jsonify({"status": "success", "data": data}), 200

    except Exception as e:
        print("❌ Monitoring API Error:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500
