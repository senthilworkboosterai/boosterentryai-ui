from flask import Blueprint, request, jsonify
from config.db_config import get_connection, release_connection
from datetime import datetime
import traceback

human_review_bp = Blueprint("human_review_bp", __name__)

@human_review_bp.route("/api/human_review", methods=["GET"])
def get_human_review():
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        client_id = request.args.get("client_id")
        from_date = request.args.get("from_date")
        to_date = request.args.get("to_date")

        # ✅ Escaping %% to ensure psycopg2 handles placeholders, not Python
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
            WHERE (d.data_extraction_status ILIKE 'Completed%%' OR d.data_extraction_status ILIKE 'Success%%')
              AND (d.erp_entry_status ILIKE 'Failed%%' OR d.erp_entry_status ILIKE 'Error%%' OR d.erp_entry_status ILIKE 'File Missing%%')
        """

        filters = []
        params = []

        # ✅ Optional client filter
        if client_id:
            filters.append("d.client_id = %s")
            params.append(client_id)

        # ✅ Date filtering logic
        if from_date and to_date:
            filters.append("DATE(d.uploaded_on) BETWEEN %s AND %s")
            params.extend([from_date, to_date])
        elif from_date:
            filters.append("DATE(d.uploaded_on) >= %s")
            params.append(from_date)
        elif to_date:
            filters.append("DATE(d.uploaded_on) <= %s")
            params.append(to_date)

        # ✅ Add dynamic filters if any
        if filters:
            base_query += " AND " + " AND ".join(filters)

        base_query += " ORDER BY d.uploaded_on DESC;"

        # Debug logging
        print("\n🟡 [HUMAN_REVIEW DEBUG]")
        print("🔹 SQL:", base_query)
        print("🔹 Params:", params)

        cur.execute(base_query, tuple(params))
        rows = cur.fetchall()

        # Column debug
        colnames = [desc[0] for desc in cur.description]
        print("🟢 Columns Returned:", colnames)
        print("🟢 Row Count:", len(rows))

        # ✅ Prepare structured JSON data
        data = []
        for r in rows:
            uploaded_on_str = (
                r[4].strftime("%Y-%m-%d %H:%M:%S")
                if isinstance(r[4], datetime)
                else str(r[4]) if r[4] else None
            )

            data.append({
                "id": r[0],
                "client_name": r[1],
                "doc_type": r[2],
                "file_name": r[3],
                "uploaded_on": uploaded_on_str,
                "overall_status": r[5],
                "data_extraction_status": r[6],
                "erp_entry_status": r[7],
            })

        release_connection(conn)
        print(f"✅ Returned {len(data)} rows.")
        return jsonify({"status": "success", "data": data}), 200

    except Exception as e:
        print("❌ Human Review API Error:", str(e))
        traceback.print_exc()

        # Attempt to safely release connection
        if conn:
            try:
                release_connection(conn)
            except Exception as ex:
                print("⚠️ DB Release Error:", str(ex))

        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500
