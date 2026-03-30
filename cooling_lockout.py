import json
import time
from pathlib import Path


def load_last_cooling_stop(path):
    try:
        with open(Path(path), "r") as f:
            return json.load(f).get("last_off", 0)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return 0


def save_last_cooling_stop(path, *, stopped_at=None):
    stopped_at = time.time() if stopped_at is None else stopped_at
    with open(Path(path), "w") as f:
        json.dump({"last_off": stopped_at}, f)
    return stopped_at


def handle_active_system_stop(*, active_call, is_active, on_cycle_end, on_cooling_stop):
    if not is_active:
        return

    on_cycle_end()
    if active_call == "COOL":
        on_cooling_stop()
