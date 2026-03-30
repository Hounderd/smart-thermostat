import unittest

from status_sync import merge_control_into_status


class MergeControlIntoStatusTests(unittest.TestCase):
    def test_merges_newer_control_state_into_stale_status(self):
        status = {
            "mode": "OFF",
            "target": 72.0,
            "fan_mode": "AUTO",
            "eco_mode": False,
            "timestamp": 100.0,
        }
        control = {
            "mode": "COOL",
            "target": 68.0,
            "fan": "ON",
            "eco": True,
            "updated_at": 105.0,
        }

        merged = merge_control_into_status(status, control, now=106.0)

        self.assertTrue(merged["control_pending"])
        self.assertEqual("COOL", merged["mode"])
        self.assertEqual(68.0, merged["target"])
        self.assertEqual("ON", merged["fan_mode"])
        self.assertTrue(merged["eco_mode"])

    def test_ignores_old_control_requests_after_status_catches_up(self):
        status = {
            "mode": "HEAT",
            "target": 70.0,
            "fan_mode": "AUTO",
            "eco_mode": False,
            "timestamp": 110.0,
        }
        control = {
            "mode": "HEAT",
            "target": 70.0,
            "fan": "AUTO",
            "eco": False,
            "updated_at": 105.0,
        }

        merged = merge_control_into_status(status, control, now=111.0)

        self.assertFalse(merged["control_pending"])
        self.assertEqual(status, {k: merged[k] for k in status})


if __name__ == "__main__":
    unittest.main()
