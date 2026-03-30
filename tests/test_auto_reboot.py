import unittest

from auto_reboot import is_auto_reboot_due, should_attempt_idle_reboot


class AutoRebootPolicyTests(unittest.TestCase):
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
