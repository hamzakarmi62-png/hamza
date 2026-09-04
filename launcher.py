import subprocess
import threading
import time
import webbrowser
import os
import tkinter as tk
from tkinter import messagebox

root_dir = r"C:\Users\dell\Desktop\hamza karmi"
backend_dir = os.path.join(root_dir, "backend")
frontend_dir = os.path.join(root_dir, "frontend")
python_exe = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")

backend_proc = None
frontend_proc = None

def start_services():
    global backend_proc, frontend_proc
    if backend_proc and backend_proc.poll() is None:
        messagebox.showinfo("تنبيه", "السيرفر يعمل بالفعل!")
        webbrowser.open("http://localhost:4173")
        return
    
    status_label.config(text="جاري تشغيل السيرفر الخلفي والأمامي...", fg="blue")
    root.update()

    def run():
        global backend_proc, frontend_proc
        try:
            backend_proc = subprocess.Popen(
                [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
                cwd=backend_dir,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            
            frontend_proc = subprocess.Popen(
                ["npm", "run", "preview", "--", "--port", "4173", "--strictPort"],
                cwd=frontend_dir,
                shell=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )

            time.sleep(3)
            status_label.config(text="الموقع يعمل بنجاح على http://localhost:4173", fg="green")
            webbrowser.open("http://localhost:4173")
        except Exception as e:
            status_label.config(text=f"حدث خطأ: {e}", fg="red")
            messagebox.showerror("خطأ", str(e))

    threading.Thread(target=run, daemon=True).start()

def stop_services():
    global backend_proc, frontend_proc
    if backend_proc:
        backend_proc.terminate()
        backend_proc = None
    if frontend_proc:
        frontend_proc.terminate()
        frontend_proc = None
    status_label.config(text="الوضع: متوقف", fg="gray")

root = tk.Tk()
root.title("متحكم تطبيق التفريغ الصوتي (STT Studio)")
root.geometry("420x280")
root.resizable(False, False)

title_lbl = tk.Label(root, text="برنامج التفريغ الصوتي (STT Studio)", font=("Arial", 14, "bold"), fg="#1e293b")
title_lbl.pack(pady=15)

start_btn = tk.Button(root, text="تشغيل الموقع وفتح المتصفح", font=("Arial", 11, "bold"), bg="#2563eb", fg="white", width=25, pady=6, command=start_services)
start_btn.pack(pady=5)

open_btn = tk.Button(root, text="فتح الرابط يدوياً في المتصفح", font=("Arial", 10), bg="#10b981", fg="white", width=25, pady=5, command=lambda: webbrowser.open("http://localhost:4173"))
open_btn.pack(pady=5)

stop_btn = tk.Button(root, text="إيقاف السيرفرات", font=("Arial", 10), bg="#ef4444", fg="white", width=25, pady=5, command=stop_services)
stop_btn.pack(pady=5)

status_label = tk.Label(root, text="الوضع: جاهز للتشغيل", font=("Arial", 10, "bold"), fg="gray")
status_label.pack(pady=10)

root.protocol("WM_DELETE_WINDOW", lambda: (stop_services(), root.destroy()))
root.mainloop()
