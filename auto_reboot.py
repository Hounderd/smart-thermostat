def calculate_booted_at(*, now, uptime_seconds):
    return now - uptime_seconds


def read_system_booted_at(*, now, uptime_path="/proc/uptime"):
    try:
        with open(uptime_path, "r", encoding="utf-8") as uptime_file:
            uptime_seconds = float(uptime_file.read().split()[0])
    except (FileNotFoundError, OSError, ValueError, IndexError):
        return now

    return calculate_booted_at(now=now, uptime_seconds=uptime_seconds)


def calculate_next_reboot_due_at(settings, *, started_at):
    if not settings.get("auto_reboot_enabled", False):
        return None

    reboot_hours = float(settings.get("auto_reboot_hours", 24))
    if reboot_hours <= 0:
        return None

    return started_at + (reboot_hours * 3600)


def is_auto_reboot_due(settings, *, started_at, now):
    next_reboot_due_at = calculate_next_reboot_due_at(settings, started_at=started_at)
    if next_reboot_due_at is None:
        return False

    return now >= next_reboot_due_at


def should_attempt_idle_reboot(
    *,
    reboot_due,
    is_active,
    last_attempt_at,
    now,
    retry_delay_seconds,
):
    if not reboot_due or is_active:
        return False

    return (now - last_attempt_at) >= retry_delay_seconds
