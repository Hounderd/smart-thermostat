import json
import sys
import types
import unittest
from unittest.mock import mock_open, patch


gpio_module = types.ModuleType("GPIO")
gpio_module.BCM = "BCM"
gpio_module.OUT = "OUT"
gpio_module.HIGH = 1
gpio_module.LOW = 0
gpio_module.setmode = lambda *args, **kwargs: None
gpio_module.setwarnings = lambda *args, **kwargs: None
gpio_module.setup = lambda *args, **kwargs: None
gpio_module.output = lambda *args, **kwargs: None
gpio_module.cleanup = lambda *args, **kwargs: None

rpi_module = types.ModuleType("RPi")
rpi_module.GPIO = gpio_module

board_module = types.ModuleType("board")
board_module.I2C = lambda: None

sys.modules.setdefault("RPi", rpi_module)
sys.modules.setdefault("RPi.GPIO", gpio_module)
sys.modules.setdefault("board", board_module)

import thermostat as thermostat_module
from thermostat import SmartThermostat


def fahrenheit_to_celsius(temp_f):
    return (temp_f - 32) * 5 / 9


class RemoteControlLogicTests(unittest.TestCase):
    def make_thermostat(self, *, local_temp, mode, target=72.0):
        thermostat = SmartThermostat.__new__(SmartThermostat)
        thermostat.PIN_FAN = 4
        thermostat.PIN_COOL = 22
        thermostat.PIN_HEAT = 6
        thermostat.relays = [thermostat.PIN_FAN, thermostat.PIN_COOL, thermostat.PIN_HEAT]
        thermostat.mode = mode
        thermostat.fan_mode = "AUTO"
        thermostat.eco_mode = False
        thermostat.target_temp = target
        thermostat.current_temp = local_temp
        thermostat.local_temp = local_temp
        thermostat.remote_temp = None
        thermostat.effective_heat_temp = local_temp
        thermostat.effective_cool_temp = local_temp
        thermostat.remote_status = "missing"
        thermostat.remote_reason = "No remote sample"
        thermostat.outside_temp = None
        thermostat.forecast_temp = None
        thermostat.humidity = 0.0
        thermostat.pressure = 0.0
        thermostat.gas = 0.0
        thermostat.iaq_score = 0
        thermostat.is_active = False
        thermostat.active_call = None
        thermostat.locked_out = False
        thermostat.auto_changeover_pending = False
        thermostat.auto_changeover_until = None
        thermostat.auto_heat_wait_pending = False
        thermostat.auto_heat_wait_until = None
        thermostat.auto_heat_wait_started_at = None
        thermostat.auto_heat_wait_start_temp = None
        thermostat.remote_active = False
        thermostat.last_ac_time = 0
        thermostat.last_stopped_call = None
        thermostat.last_call_stopped_at = 0
        thermostat.fan_cool_started_at = 0
        thermostat.fan_cool_start_temp = None
        thermostat.booted_at = 0
        thermostat.last_reboot_attempt = 0
        thermostat.reboot_pending = False
        thermostat.current_run_start = 0
        thermostat.last_run_duration = 0
        thermostat.last_run_end = 0
        thermostat.heat_loss_rate = 0.5
        thermostat.last_temp_sample = local_temp
        thermostat.last_temp_time = 0
        thermostat.cycle_timestamps = []
        thermostat.short_cycle_alert = False
        thermostat.settings = {
            "filter_current_hours": 0,
            "filter_max_hours": 300,
            "core_deadband": 0.5,
            "eco_hysteresis_mild": 3.0,
            "eco_hysteresis_strict": 0.5,
            "auto_fan_cool_enabled": False,
            "auto_fan_cool_max_outside_temp": 50.0,
            "auto_fan_cool_fallback_minutes": 10.0,
            "auto_fan_cool_min_drop": 0.5,
            "auto_changeover_delay_minutes": 2,
            "auto_heat_wait_max_outside_temp": 50.0,
            "auto_heat_wait_minutes": 15.0,
            "auto_heat_wait_min_rise": 0.5,
            "cost_kwh": 0.14,
            "cost_therm": 1.10,
            "ac_kw": 3.5,
            "furnace_btu": 80000,
            "auto_reboot_enabled": False,
            "auto_reboot_hours": 24,
            "remote_max_delta": 15.0,
            "remote_sample_max_age_seconds": 300,
        }
        thermostat.HYSTERESIS = 0.5
        thermostat.CYCLE_DELAY = 300
        thermostat.FAN_ON_HEAT = False
        thermostat.sensor_adt = types.SimpleNamespace(temperature=fahrenheit_to_celsius(local_temp))
        thermostat.sensor_bme = None
        thermostat.load_control = lambda: None
        thermostat.update_heat_loss_rate = lambda: None
        thermostat.update_filter_hours = lambda elapsed: None
        thermostat.write_status = lambda: None
        thermostat.update_auto_reboot_state = lambda now: None
        thermostat.maybe_auto_reboot = lambda now: None
        thermostat.calculate_iaq = lambda: None
        thermostat.save_lockout = lambda: None
        thermostat.record_cycle_start = lambda: None
        thermostat.record_cycle_end = lambda: None
        thermostat._relay = lambda pin, state: None
        return thermostat

    def run_get_readings_with_remote(self, thermostat, *, temp, timestamp, now=None):
        remote_payload = json.dumps({"temp": temp, "timestamp": timestamp})
        with patch.object(thermostat_module.os.path, "exists", return_value=True), patch(
            "builtins.open",
            mock_open(read_data=remote_payload),
        ):
            thermostat.get_readings(now=now)

    def run_logic_loop_with_remote(self, thermostat, *, temp, timestamp, now):
        remote_payload = json.dumps({"temp": temp, "timestamp": timestamp})
        with patch.object(thermostat_module.os.path, "exists", return_value=True), patch(
            "builtins.open",
            mock_open(read_data=remote_payload),
        ):
            thermostat.logic_loop(elapsed_seconds=1, now=now)

    def test_stale_remote_sample_is_ignored(self):
        thermostat = self.make_thermostat(local_temp=70.0, mode="COOL")

        self.run_get_readings_with_remote(thermostat, temp=78.0, timestamp=1, now=1000)

        self.assertFalse(thermostat.remote_active)
        self.assertEqual(thermostat.remote_status, "stale")
        self.assertEqual(thermostat.effective_cool_temp, 70.0)

    def test_outlier_remote_sample_is_rejected(self):
        thermostat = self.make_thermostat(local_temp=70.0, mode="HEAT")

        self.run_get_readings_with_remote(thermostat, temp=40.0, timestamp=1000, now=1000)

        self.assertFalse(thermostat.remote_active)
        self.assertEqual(thermostat.remote_status, "rejected_outlier")
        self.assertEqual(thermostat.effective_heat_temp, 70.0)

    def test_effective_heat_temp_uses_trusted_average_sensor(self):
        thermostat = self.make_thermostat(local_temp=70.0, mode="HEAT")

        self.run_get_readings_with_remote(thermostat, temp=66.0, timestamp=1000, now=1000)

        self.assertEqual(thermostat.effective_heat_temp, 68.0)
        self.assertEqual(thermostat.current_temp, 68.0)

    def test_effective_cool_temp_uses_trusted_average_sensor(self):
        thermostat = self.make_thermostat(local_temp=70.0, mode="COOL")

        self.run_get_readings_with_remote(thermostat, temp=76.0, timestamp=1000, now=1000)

        self.assertEqual(thermostat.effective_cool_temp, 73.0)
        self.assertEqual(thermostat.current_temp, 73.0)

    def test_auto_starts_heat_when_remote_room_is_cold(self):
        thermostat = self.make_thermostat(local_temp=72.0, mode="AUTO", target=70.0)

        self.run_logic_loop_with_remote(thermostat, temp=68.0, timestamp=1000, now=1000)

        self.assertIsNone(thermostat.active_call)

    def test_auto_starts_cool_when_remote_room_is_hot(self):
        thermostat = self.make_thermostat(local_temp=74.0, mode="AUTO", target=74.0)

        self.run_logic_loop_with_remote(thermostat, temp=76.0, timestamp=1000, now=1000)

        self.assertEqual(thermostat.active_call, "COOL")

    def test_auto_uses_average_before_starting_heat(self):
        thermostat = self.make_thermostat(local_temp=72.0, mode="AUTO", target=71.0)

        self.run_logic_loop_with_remote(thermostat, temp=68.0, timestamp=1000, now=1000)

        self.assertEqual(thermostat.active_call, "HEAT")


if __name__ == "__main__":
    unittest.main()
