from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import json
import os
import sqlite3
import time
from status_sync import merge_control_into_status

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

APP_DIR = os.path.dirname(os.path.abspath(__file__))
STATUS_FILE = "status.json"
CONTROL_FILE = "control.json"
REMOTE_FILE = "remote.json"
SETTINGS_FILE = "settings.json"
DB_FILE = "history.db"

# --- CONFIGURATION ---
LOCAL_SUBNET = "192.168." 

# --- MIDDLEWARE ---
@app.middleware("http")
async def ip_restriction_middleware(request: Request, call_next):
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for: client_ip = x_forwarded_for.split(",")[0]
    else: client_ip = request.client.host
    
    is_local = client_ip.startswith(LOCAL_SUBNET) or client_ip == "127.0.0.1"

    if not is_local and request.method == "POST" and request.url.path != "/remote":
        return JSONResponse(status_code=403, content={"error": "Read-Only Access for External Users"})

    request.state.is_read_only = not is_local
    response = await call_next(request)
    return response

class ControlSettings(BaseModel):
    mode: str
    target: float
    fan: str
    eco: bool

class RemoteData(BaseModel):
    temp: float

class SystemSettings(BaseModel):
    cost_kwh: float
    cost_therm: float
    ac_kw: float
    furnace_btu: float
    filter_current_hours: float
    filter_max_hours: float
    core_deadband: float
    eco_hysteresis_mild: float
    eco_hysteresis_strict: float
    auto_fan_cool_enabled: bool
    auto_fan_cool_max_outside_temp: float
    auto_fan_cool_fallback_minutes: float
    auto_fan_cool_min_drop: float
    auto_changeover_delay_minutes: float
    auto_reboot_enabled: bool
    auto_reboot_hours: float


def frontend_path(*parts):
    return os.path.join(APP_DIR, "smart-thermostat", "dist", *parts)


def resolve_frontend_request_path(full_path):
    if full_path.startswith(("/", "\\")) or os.path.isabs(full_path):
        return None

    normalized_path = os.path.normpath(full_path)
    if normalized_path.startswith("..") or os.path.isabs(normalized_path):
        return None

    if normalized_path in ("", "."):
        return frontend_path()

    return frontend_path(*normalized_path.split(os.sep))


def read_json_file(path, fallback=None):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return fallback

@app.get("/status")
def get_status(request: Request):
    if not os.path.exists(STATUS_FILE): return {"error": "Init..."}
    try:
        data = read_json_file(STATUS_FILE, {"error": "Read Error"})
        if data.get("error"):
            return data

        control = read_json_file(CONTROL_FILE)
        data = merge_control_into_status(data, control)
        data["read_only"] = getattr(request.state, "is_read_only", False)
        return data
    except: return {"error": "Read Error"}

@app.post("/control")
def update_control(s: ControlSettings):
    data = {"mode": s.mode, "target": s.target, "fan": s.fan, "eco": s.eco, "updated_at": time.time()}
    with open(CONTROL_FILE, "w") as f: json.dump(data, f)
    return {"status": "ok", "control": data}

@app.get("/settings")
def get_settings():
    if not os.path.exists(SETTINGS_FILE): return {}
    with open(SETTINGS_FILE, "r") as f: return json.load(f)

@app.post("/settings")
def update_settings(s: SystemSettings):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(s.dict(), f)
    return {"status": "saved"}

@app.post("/remote")
def receive_remote(data: RemoteData):
    with open(REMOTE_FILE, "w") as f:
        json.dump({"temp": data.temp, "timestamp": time.time()}, f)
    return {"status": "received"}

@app.get("/history")
def get_history():
    if not os.path.exists(DB_FILE): return []
    
    # Use timeout to avoid database locked errors
    conn = sqlite3.connect(DB_FILE, timeout=30)
    c = conn.cursor()
    cutoff = time.time() - 86400
    
    # Check if outside_temp exists in schema before querying to avoid crashes
    # during migration window
    try:
        c.execute("SELECT timestamp, temp, humidity, pressure, gas, action, outside_temp FROM history WHERE timestamp > ? ORDER BY timestamp ASC", (cutoff,))
    except sqlite3.OperationalError:
        # Fallback for old schema if migration hasn't finished
        c.execute("SELECT timestamp, temp, humidity, pressure, gas, action FROM history WHERE timestamp > ? ORDER BY timestamp ASC", (cutoff,))
        
    rows = c.fetchall()
    conn.close()
    
    return [{
        "time": r[0], 
        "temp": r[1], 
        "humidity": r[2],
        "pressure": r[3],
        "gas": r[4],
        "action": r[5],
        "outside": r[6] if len(r) > 6 else None
    } for r in rows]

# --- SERVE REACT ---
app.mount("/assets", StaticFiles(directory=frontend_path("assets")), name="assets")

@app.get("/")
async def serve_react_root():
    return FileResponse(frontend_path("index.html"))

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    requested_path = resolve_frontend_request_path(full_path)
    if requested_path and os.path.exists(requested_path):
        return FileResponse(requested_path)
    return FileResponse(frontend_path("index.html"))
