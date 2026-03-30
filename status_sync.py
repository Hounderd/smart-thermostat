import time


CONTROL_TO_STATUS_FIELDS = {
    "mode": "mode",
    "target": "target",
    "fan": "fan_mode",
    "eco": "eco_mode",
}

PENDING_CONTROL_GRACE_SECONDS = 15


def merge_control_into_status(status_data, control_data, *, now=None):
    merged = dict(status_data or {})
    if not control_data:
        merged["control_pending"] = False
        return merged

    updated_at = control_data.get("updated_at")
    if updated_at is None:
        merged["control_pending"] = False
        return merged

    now = time.time() if now is None else now
    status_timestamp = float(merged.get("timestamp") or 0)
    control_is_recent = (now - updated_at) <= PENDING_CONTROL_GRACE_SECONDS
    control_differs = any(
        merged.get(status_key) != control_data.get(control_key)
        for control_key, status_key in CONTROL_TO_STATUS_FIELDS.items()
    )
    pending = control_is_recent and (updated_at > status_timestamp or control_differs)

    if pending:
        for control_key, status_key in CONTROL_TO_STATUS_FIELDS.items():
            merged[status_key] = control_data.get(control_key)

    merged["control_pending"] = pending
    merged["control_updated_at"] = updated_at
    return merged
