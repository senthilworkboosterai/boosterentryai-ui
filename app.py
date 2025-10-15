from flask import Flask
from flask_cors import CORS
from routes.upload_routes import upload_bp
from routes.monitoring_routes import monitoring_bp
from routes.human_review_routes import human_review_bp
from routes.dashboard_routes import dashboard_bp

from dotenv import load_dotenv
import os

# ✅ Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# ✅ Register routes
app.register_blueprint(upload_bp)
app.register_blueprint(monitoring_bp) 
app.register_blueprint(human_review_bp)
app.register_blueprint(dashboard_bp)

# ✅ Print current environment for debugging
print(f"✅ Environment: {os.getenv('ENVIRONMENT', 'UNKNOWN')}")
print(f"✅ Upload folder: {os.getenv('UPLOAD_FOLDER', 'uploaded_docs')}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
