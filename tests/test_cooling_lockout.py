import unittest
from pathlib import Path

from cooling_lockout import (
    handle_active_system_stop,
    load_last_cooling_stop,
    save_last_cooling_stop,
)


class CoolingLockoutTests(unittest.TestCase):
    def test_handle_active_system_stop_persists_lockout_for_active_cooling_call(self):
        events = []

        handle_active_system_stop(
            active_call="COOL",
            is_active=True,
            on_cycle_end=lambda: events.append("cycle_end"),
            on_cooling_stop=lambda: events.append("cooling_stop"),
        )

        self.assertEqual(["cycle_end", "cooling_stop"], events)

    def test_handle_active_system_stop_skips_lockout_for_heating_call(self):
        events = []

        handle_active_system_stop(
            active_call="HEAT",
            is_active=True,
            on_cycle_end=lambda: events.append("cycle_end"),
            on_cooling_stop=lambda: events.append("cooling_stop"),
        )

        self.assertEqual(["cycle_end"], events)

    def test_save_and_load_last_cooling_stop_round_trip(self):
        lockout_path = Path("tests") / ".tmp-lockout.json"
        if lockout_path.exists():
            lockout_path.unlink()

        try:
            saved = save_last_cooling_stop(lockout_path, stopped_at=123.45)
            loaded = load_last_cooling_stop(lockout_path)
        finally:
            if lockout_path.exists():
                lockout_path.unlink()

        self.assertEqual(123.45, saved)
        self.assertEqual(123.45, loaded)


if __name__ == "__main__":
    unittest.main()
