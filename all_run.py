import subprocess
import os
import time
import sys
from dotenv import load_dotenv

# ✅ Load environment variables from .env
load_dotenv()

# Paths
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = ROOT_DIR
REACT_DIR = ROOT_DIR

# Environment variables
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploaded_docs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

print("🚀 Starting BoosterEntryAI Full Stack...")
print(f"📂 Upload Folder: {UPLOAD_FOLDER}")

# Commands
flask_command = ["python3", "app.py"]
react_command = ["npm", "run", "dev"]

# Helper to run a process
def run_process(cmd, cwd):
    return subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True
    )

try:
    # Start Flask API
    print("\n🟢 Starting Flask API server (port 5050)...")
    flask_proc = run_process(flask_command, API_DIR)

    # Wait a bit before starting React
    time.sleep(3)

    # Start React UI
    print("\n🟣 Starting React UI server (port 5173)...")
    react_proc = run_process(react_command, REACT_DIR)

    print("\n✅ Both Flask and React are running.")
    print("🌍 Flask API:   http://127.0.0.1:5050")
    print("💻 React UI:   http://localhost:5173\n")
    print("Press Ctrl+C to stop both servers.\n")

    # Stream logs
    while True:
        flask_line = flask_proc.stdout.readline()
        react_line = react_proc.stdout.readline()

        if flask_line:
            sys.stdout.write("🟢 [FLASK] " + flask_line)
        if react_line:
            sys.stdout.write("🟣 [REACT] " + react_line)

        if flask_proc.poll() is not None or react_proc.poll() is not None:
            break

except KeyboardInterrupt:
    print("\n🛑 Stopping servers...")
    flask_proc.terminate()
    react_proc.terminate()
    print("✅ All stopped successfully.")
