from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os

# ✅ Import route blueprints
from routes.upload_routes import upload_bp
from routes.human_review_routes import human_review_bp
from routes.dashboard_routes import dashboard_bp
from routes.fix_review_routes import fix_review_bp
from routes.monitoring_routes import monitoring_bp
from routes.login_route import login_bp  # ✅ NEW

# -----------------------------------------------------------
# ✅ Load environment variables from .env file
# -----------------------------------------------------------
load_dotenv()

# -----------------------------------------------------------
# ✅ Initialize Flask App
# -----------------------------------------------------------
app = Flask(__name__)
CORS(app)  # Allow frontend (React) to make API calls

# -----------------------------------------------------------
# ✅ Register all blueprints (routes)
# -----------------------------------------------------------
app.register_blueprint(upload_bp)
app.register_blueprint(monitoring_bp)
app.register_blueprint(human_review_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(fix_review_bp)
app.register_blueprint(login_bp)




# -----------------------------------------------------------
# ✅ Print environment info for debugging
# -----------------------------------------------------------
ENVIRONMENT = os.getenv("ENVIRONMENT", "LOCAL")
UPLOAD_FOLDER = os.path.abspath(os.getenv("UPLOAD_FOLDER", "uploaded_docs"))

print(f"✅ Environment: {ENVIRONMENT}")
print(f"✅ Upload folder: {UPLOAD_FOLDER}")

# -----------------------------------------------------------
# ✅ Serve PDF and image files
# -----------------------------------------------------------
@app.route("/uploaded_docs/<path:filename>")
def serve_uploaded_docs(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# -----------------------------------------------------------
# ✅ Run the app
# -----------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=30010, debug=True)
