import unittest

from api import SystemSettings


class SystemSettingsTests(unittest.TestCase):
    def test_accepts_auto_changeover_delay_minutes(self):
        settings = SystemSettings(
            cost_kwh=0.12,
            cost_therm=0.7,
            ac_kw=3.5,
            furnace_btu=80000,
            filter_current_hours=10,
            filter_max_hours=300,
            core_deadband=0.5,
            eco_hysteresis_mild=3.0,
            eco_hysteresis_strict=0.5,
            auto_fan_cool_enabled=True,
            auto_fan_cool_max_outside_temp=50.0,
            auto_changeover_delay_minutes=2,
            auto_reboot_enabled=True,
            auto_reboot_hours=24,
        )

        self.assertEqual(2, settings.auto_changeover_delay_minutes)

    def test_accepts_auto_fan_cool_settings(self):
        settings = SystemSettings(
            cost_kwh=0.12,
            cost_therm=0.7,
            ac_kw=3.5,
            furnace_btu=80000,
            filter_current_hours=10,
            filter_max_hours=300,
            core_deadband=0.5,
            eco_hysteresis_mild=3.0,
            eco_hysteresis_strict=0.5,
            auto_fan_cool_enabled=True,
            auto_fan_cool_max_outside_temp=50.0,
            auto_changeover_delay_minutes=2,
            auto_reboot_enabled=True,
            auto_reboot_hours=24,
        )

        self.assertTrue(settings.auto_fan_cool_enabled)
        self.assertEqual(50.0, settings.auto_fan_cool_max_outside_temp)


if __name__ == "__main__":
    unittest.main()
