import unittest

from auto_reboot import (
    calculate_booted_at,
    calculate_next_reboot_due_at,
    is_auto_reboot_due,
    should_attempt_idle_reboot,
)


class AutoRebootPolicyTests(unittest.TestCase):
    def test_calculate_booted_at_subtracts_uptime_from_current_time(self):
        booted_at = calculate_booted_at(now=1000, uptime_seconds=400)

        self.assertEqual(600, booted_at)

    def test_next_reboot_due_at_uses_boot_time_and_hours(self):
        settings = {"auto_reboot_enabled": True, "auto_reboot_hours": 24}

        next_due = calculate_next_reboot_due_at(settings, started_at=600)

        self.assertEqual(600 + (24 * 60 * 60), next_due)

    def test_next_reboot_due_at_is_none_when_disabled(self):
        settings = {"auto_reboot_enabled": False, "auto_reboot_hours": 24}

        next_due = calculate_next_reboot_due_at(settings, started_at=600)

        self.assertIsNone(next_due)

    def test_auto_reboot_is_not_due_when_disabled(self):
        settings = {"auto_reboot_enabled": False, "auto_reboot_hours": 24}

        due = is_auto_reboot_due(settings, started_at=0, now=60 * 60 * 48)

        self.assertFalse(due)

    def test_auto_reboot_is_due_after_configured_interval(self):
        settings = {"auto_reboot_enabled": True, "auto_reboot_hours": 24}

        due = is_auto_reboot_due(settings, started_at=100, now=100 + (24 * 60 * 60))

        self.assertTrue(due)

    def test_idle_reboot_waits_for_active_hvac_session_to_finish(self):
        attempt = should_attempt_idle_reboot(
            reboot_due=True,
            is_active=True,
            last_attempt_at=0,
            now=60 * 60 * 24,
            retry_delay_seconds=60,
        )

        self.assertFalse(attempt)

    def test_idle_reboot_runs_once_idle_and_retry_delay_elapsed(self):
        attempt = should_attempt_idle_reboot(
            reboot_due=True,
            is_active=False,
            last_attempt_at=60,
            now=121,
            retry_delay_seconds=60,
        )

        self.assertTrue(attempt)

    def test_idle_reboot_does_not_retry_every_loop_after_failure(self):
        attempt = should_attempt_idle_reboot(
            reboot_due=True,
            is_active=False,
            last_attempt_at=100,
            now=120,
            retry_delay_seconds=60,
        )

        self.assertFalse(attempt)


if __name__ == "__main__":
    unittest.main()
