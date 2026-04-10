import sys
import types
import unittest
from unittest.mock import patch


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

from thermostat import SmartThermostat


def make_test_thermostat(*, mode, current_temp, target, is_active=False, active_call=None, last_ac_time=0):
    thermostat = SmartThermostat.__new__(SmartThermostat)
    thermostat.PIN_FAN = 4
    thermostat.PIN_COOL = 22
    thermostat.PIN_HEAT = 6
    thermostat.mode = mode
    thermostat.fan_mode = "AUTO"
    thermostat.eco_mode = False
    thermostat.target_temp = target
    thermostat.current_temp = current_temp
    thermostat.outside_temp = None
    thermostat.forecast_temp = None
    thermostat.humidity = 0.0
    thermostat.pressure = 0.0
    thermostat.gas = 0.0
    thermostat.iaq_score = 0
    thermostat.is_active = is_active
    thermostat.active_call = active_call
    thermostat.locked_out = False
    thermostat.remote_active = False
    thermostat.last_ac_time = last_ac_time
    thermostat.started_at = 0
    thermostat.last_reboot_attempt = 0
    thermostat.reboot_pending = False
    thermostat.current_run_start = 0
    thermostat.last_run_duration = 0
    thermostat.last_run_end = 0
    thermostat.heat_loss_rate = 0.5
    thermostat.last_temp_sample = current_temp
    thermostat.last_temp_time = 0
    thermostat.cycle_timestamps = []
    thermostat.short_cycle_alert = False
    thermostat.settings = {
        "filter_current_hours": 0,
        "filter_max_hours": 300,
        "eco_hysteresis_mild": 3.0,
        "eco_hysteresis_strict": 0.5,
        "auto_reboot_enabled": False,
        "auto_reboot_hours": 24,
    }
    thermostat.HYSTERESIS = 0.5
    thermostat.CYCLE_DELAY = 300
    thermostat.FAN_ON_HEAT = False

    relay_calls = []

    thermostat.load_control = lambda: None
    thermostat.get_readings = lambda: None
    thermostat.update_heat_loss_rate = lambda: None
    thermostat.update_filter_hours = lambda elapsed_seconds: None
    thermostat.calculate_eco_deadband = lambda: thermostat.HYSTERESIS
    thermostat.check_smart_recovery = lambda: False
    thermostat.record_cycle_start = lambda: relay_calls.append(("cycle_start", None))
    thermostat.record_cycle_end = lambda: relay_calls.append(("cycle_end", None))
    thermostat.save_lockout = lambda: relay_calls.append(("lockout_saved", None))
    thermostat.update_auto_reboot_state = lambda now: None
    thermostat.write_status = lambda: None
    thermostat.maybe_auto_reboot = lambda now: None
    thermostat._relay = lambda pin, state: relay_calls.append((pin, state))

    return thermostat, relay_calls


class FakeCursor:
    def __init__(self):
        self.executions = []

    def execute(self, query, params=None):
        self.executions.append((query, params))

    def fetchall(self):
        return []


class FakeConnection:
    def __init__(self):
        self.cursor_instance = FakeCursor()

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        return None

    def close(self):
        return None


class AutoModeTests(unittest.TestCase):
    def test_auto_mode_starts_heating_below_band(self):
        thermostat, relay_calls = make_test_thermostat(mode="AUTO", current_temp=70.0, target=72.0)

        with patch("thermostat.time.time", return_value=1000):
            SmartThermostat.logic_loop(thermostat, elapsed_seconds=1)

        self.assertTrue(thermostat.is_active)
        self.assertEqual("HEAT", thermostat.active_call)
        self.assertIn((thermostat.PIN_HEAT, True), relay_calls)

    def test_auto_mode_starts_cooling_above_band(self):
        thermostat, relay_calls = make_test_thermostat(mode="AUTO", current_temp=74.0, target=72.0)

        with patch("thermostat.time.time", return_value=1000):
            SmartThermostat.logic_loop(thermostat, elapsed_seconds=1)

        self.assertTrue(thermostat.is_active)
        self.assertEqual("COOL", thermostat.active_call)
        self.assertIn((thermostat.PIN_COOL, True), relay_calls)

    def test_auto_mode_stays_idle_inside_deadband(self):
        thermostat, relay_calls = make_test_thermostat(mode="AUTO", current_temp=72.0, target=72.0)

        with patch("thermostat.time.time", return_value=1000):
            SmartThermostat.logic_loop(thermostat, elapsed_seconds=1)

        self.assertFalse(thermostat.is_active)
        self.assertIsNone(thermostat.active_call)
        self.assertNotIn((thermostat.PIN_HEAT, True), relay_calls)
        self.assertNotIn((thermostat.PIN_COOL, True), relay_calls)

    def test_auto_mode_respects_cooling_lockout(self):
        thermostat, relay_calls = make_test_thermostat(
            mode="AUTO",
            current_temp=75.0,
            target=72.0,
            last_ac_time=900,
        )

        with patch("thermostat.time.time", return_value=1000):
            SmartThermostat.logic_loop(thermostat, elapsed_seconds=1)

        self.assertTrue(thermostat.locked_out)
        self.assertFalse(thermostat.is_active)
        self.assertIsNone(thermostat.active_call)
        self.assertNotIn((thermostat.PIN_COOL, True), relay_calls)

    def test_history_records_active_call_when_auto_is_running(self):
        thermostat, _ = make_test_thermostat(
            mode="AUTO",
            current_temp=74.0,
            target=72.0,
            is_active=True,
            active_call="COOL",
        )
        fake_connection = FakeConnection()

        with patch("thermostat.sqlite3.connect", return_value=fake_connection):
            SmartThermostat.save_history(thermostat)

        _, params = fake_connection.cursor_instance.executions[-1]
        self.assertEqual("COOL", params[6])


if __name__ == "__main__":
    unittest.main()
