import subprocess
import time
import webbrowser
import os

root_dir = r"C:\Users\dell\Desktop\hamza karmi"
backend_dir = os.path.join(root_dir, "backend")
frontend_dir = os.path.join(root_dir, "frontend")

python_exe = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")

print("Starting FastAPI Backend...")
backend_process = subprocess.Popen(
    [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    cwd=backend_dir
)

print("Starting Frontend Preview...")
frontend_process = subprocess.Popen(
    "npm run preview -- --port 4173 --strictPort",
    cwd=frontend_dir,
    shell=True
)

print("Waiting for servers to start...")
time.sleep(3)

url = "http://localhost:4173"
print(f"Opening browser at {url}")
webbrowser.open(url)
