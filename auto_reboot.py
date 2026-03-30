def is_auto_reboot_due(settings, *, started_at, now):
    if not settings.get("auto_reboot_enabled", False):
        return False

    reboot_hours = float(settings.get("auto_reboot_hours", 24))
    if reboot_hours <= 0:
        return False

    return (now - started_at) >= (reboot_hours * 3600)


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
