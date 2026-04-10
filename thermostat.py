import RPi.GPIO as GPIO
import time
import board
import json
import os
import sqlite3
import subprocess
import threading
from datetime import datetime
from auto_reboot import (
    calculate_next_reboot_due_at,
    is_auto_reboot_due,
    read_system_booted_at,
    should_attempt_idle_reboot,
)
from cooling_lockout import (
    handle_active_system_stop,
    load_last_cooling_stop,
    save_last_cooling_stop,
)
from weather_fetch import WeatherFetchError, fetch_weather_snapshot

# ---------------- CONFIGURATION ----------------
DB_FILE = "history.db"
CONTROL_FILE = "control.json"
STATUS_FILE = "status.json"
LOCKOUT_FILE = "lockout.json"
REMOTE_FILE = "remote.json"
SETTINGS_FILE = "settings.json"
LOOP_INTERVAL = 1

LAT = 43.19
LON = -88.72

# --- SENSOR SETUP ---
try:
    import adafruit_adt7410
    HAS_ADT = True
except ImportError: HAS_ADT = False
try:
    import adafruit_bme680
    HAS_BME = True
except ImportError: HAS_BME = False

class SmartThermostat:
    def __init__(self):
        # GPIO
        self.PIN_FAN = 4
        self.PIN_COOL = 22
        self.PIN_HEAT = 6
        self.relays = [self.PIN_FAN, self.PIN_COOL, self.PIN_HEAT]

        # State
        self.mode = "OFF"
        self.fan_mode = "AUTO"
        self.eco_mode = False
        self.target_temp = 72.0
        
        self.current_temp = 0.0
        self.outside_temp = None
        self.forecast_temp = None
        
        # Sensor Data
        self.humidity = 0.0
        self.pressure = 0.0
        self.gas = 0.0
        self.iaq_score = 0
        
        self.is_active = False
        self.active_call = None
        self.locked_out = False
        self.remote_active = False
        self.last_ac_time = self.load_lockout()
        self.booted_at = read_system_booted_at(now=time.time())
        self.last_reboot_attempt = 0
        self.reboot_pending = False

        # Cycle Timing Tracking (New)
        self.current_run_start = 0
        self.last_run_duration = 0
        self.last_run_end = 0

        # Eco / Diagnostics
        self.heat_loss_rate = 0.5 
        self.last_temp_sample = None
        self.last_temp_time = time.time()
        
        self.cycle_timestamps = [] 
        self.short_cycle_alert = False
        self.settings = self.load_settings()
        self.HYSTERESIS = 0.5
        self.CYCLE_DELAY = 300
        self.FAN_ON_HEAT = False

        # Hardware Setup
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        GPIO.setup(self.relays, GPIO.OUT)
        self.all_off()
        
        self.init_db()
        self._init_sensors()
        
        # Start Weather Background Thread
        threading.Thread(target=self.weather_worker, daemon=True).start()

    # ---------------- INIT & HELPERS ----------------
    def init_db(self):
        try:
            conn = sqlite3.connect(DB_FILE, timeout=30)
            c = conn.cursor()
            
            c.execute('''CREATE TABLE IF NOT EXISTS history 
                         (timestamp REAL, temp REAL, humidity REAL, pressure REAL, gas REAL, target REAL, action TEXT)''')
            
            # Migration check
            c.execute("PRAGMA table_info(history)")
            columns = [info[1] for info in c.fetchall()]
            if "outside_temp" not in columns:
                print("Migrating Database: Adding outside_temp column...")
                c.execute("ALTER TABLE history ADD COLUMN outside_temp REAL")
                
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"DB Init Error: {e}")

    def _init_sensors(self):
        try: self.i2c = board.I2C()
        except: self.i2c = None
        self.sensor_adt = None
        self.sensor_bme = None
        if self.i2c:
            if HAS_ADT:
                try: 
                    self.sensor_adt = adafruit_adt7410.ADT7410(self.i2c, address=0x48)
                    self.sensor_adt.high_resolution = True
                except: pass
            if HAS_BME:
                try: self.sensor_bme = adafruit_bme680.Adafruit_BME680_I2C(self.i2c, address=0x77)
                except: pass

    def load_lockout(self):
        return load_last_cooling_stop(LOCKOUT_FILE)

    def save_lockout(self):
        self.last_ac_time = save_last_cooling_stop(LOCKOUT_FILE)

    def load_control(self):
        if not os.path.exists(CONTROL_FILE): return
        try:
            with open(CONTROL_FILE, "r") as f:
                data = json.load(f)
                self.mode = data.get("mode", "OFF")
                self.target_temp = float(data.get("target", 72.0))
                self.fan_mode = data.get("fan", "AUTO")
                self.eco_mode = data.get("eco", False)
        except: pass

    def load_settings(self):
        defaults = {
            "filter_current_hours": 0, "filter_max_hours": 300,
            "core_deadband": 0.5,
            "eco_hysteresis_mild": 3.0, "eco_hysteresis_strict": 0.5,
            "cost_kwh": 0.14, "cost_therm": 1.10, "ac_kw": 3.5, "furnace_btu": 80000,
            "auto_reboot_enabled": False, "auto_reboot_hours": 24,
        }
        if not os.path.exists(SETTINGS_FILE): return defaults
        try:
            with open(SETTINGS_FILE, "r") as f: 
                loaded = json.load(f)
                return {**defaults, **loaded}
        except: return defaults

    def save_settings(self):
        try:
            with open(SETTINGS_FILE, "w") as f: json.dump(self.settings, f)
        except: pass

    # ---------------- INTELLIGENCE ----------------

    def weather_worker(self):
        while True:
            try:
                snapshot = fetch_weather_snapshot(lat=LAT, lon=LON)
                self.outside_temp = snapshot["outside_temp"]
                self.forecast_temp = snapshot["forecast_temp"]
            except WeatherFetchError as e:
                print(f"Weather Error: {e}")
            time.sleep(900)

    def update_heat_loss_rate(self):
        if self.is_active or self.mode != "HEAT": 
            self.last_temp_sample = self.current_temp
            self.last_temp_time = time.time()
            return

        now = time.time()
        delta = now - self.last_temp_time
        if delta < 600: return 

        temp_drop = self.last_temp_sample - self.current_temp
        if temp_drop > 0:
            current_rate = (temp_drop / delta) * 3600
            self.heat_loss_rate = (self.heat_loss_rate * 0.7) + (current_rate * 0.3)

        self.last_temp_sample = self.current_temp
        self.last_temp_time = now

    def calculate_eco_deadband(self):
        deadband = 1.0 
        mild_setting = self.settings.get("eco_hysteresis_mild", 3.0)
        strict_setting = self.settings.get("eco_hysteresis_strict", 0.5)

        if self.outside_temp and self.outside_temp < 20: 
            deadband = strict_setting
        elif self.outside_temp and (55 <= self.outside_temp <= 75): 
            deadband = mild_setting
            
        return deadband

    def get_core_deadband(self):
        return float(self.settings.get("core_deadband", self.HYSTERESIS))

    def check_smart_recovery(self):
        now = datetime.now()
        target_hour = 6 
        if now.hour >= target_hour: return False 
        if now.hour < 4: return False 
        
        temp_gap = self.target_temp - self.current_temp
        if temp_gap <= 0: return False
        
        gain_rate = 3.0 
        if self.outside_temp and self.outside_temp < 20: gain_rate = 1.5
        
        minutes_needed = (temp_gap / gain_rate) * 60
        minutes_until_wake = ((target_hour - now.hour) * 60) - now.minute
        return minutes_needed >= minutes_until_wake

    # ---------------- DIAGNOSTICS & TIMING ----------------

    def record_cycle_start(self):
        now = time.time()
        self.current_run_start = now # Start timer
        self.cycle_timestamps.append(now)
        self.cycle_timestamps = [t for t in self.cycle_timestamps if now - t < 3600]
        self.short_cycle_alert = len(self.cycle_timestamps) > 4

    def record_cycle_end(self):
        if self.current_run_start > 0:
            self.last_run_end = time.time()
            self.last_run_duration = self.last_run_end - self.current_run_start
            self.current_run_start = 0

    def update_filter_hours(self, elapsed_seconds):
        increment_hours = elapsed_seconds / 3600
        self.settings["filter_current_hours"] += increment_hours
        if int(time.time()) % 300 < 5: 
            self.save_settings()

    # ---------------- SENSORS & STATUS ----------------

    def calculate_iaq(self):
        hum_score = 0
        if self.humidity >= 38 and self.humidity <= 42: hum_score = 25
        else:
            if self.humidity < 38: hum_score = 25 - ((38 - self.humidity) * 0.25)
            else: hum_score = 25 + ((self.humidity - 42) * 0.25)
        
        gas_score = 0
        gas_ref = 250000 
        gas_limit = 50000 
        if self.gas > gas_ref: self.gas = gas_ref
        if self.gas < gas_limit: self.gas = gas_limit
        gas_score = (0.75 / (gas_ref - gas_limit) * self.gas) * 100
        raw_iaq = (100 - (hum_score + gas_score)) * 5
        self.iaq_score = round(max(0, min(500, raw_iaq)))

    def get_readings(self):
        temp_c = 0
        if self.sensor_adt: temp_c = self.sensor_adt.temperature
        elif self.sensor_bme: temp_c = self.sensor_bme.temperature - 2.0 
        local_temp = round((temp_c * 9/5) + 32, 2)
        
        if self.sensor_bme:
            self.humidity = round(self.sensor_bme.humidity, 1)
            self.pressure = round(self.sensor_bme.pressure, 1)
            self.gas = self.sensor_bme.gas 
            self.calculate_iaq()
            self.gas = round(self.gas / 1000, 1)
            
        self.remote_active = False
        final_temp = local_temp

        if os.path.exists(REMOTE_FILE):
            try:
                with open(REMOTE_FILE, "r") as f:
                    rdata = json.load(f)
                    if time.time() - rdata.get("timestamp", 0) < 300:
                        remote_temp = rdata.get("temp", local_temp)
                        self.remote_active = True
                        if self.mode == "COOL": final_temp = max(local_temp, remote_temp)
                        elif self.mode == "HEAT": final_temp = min(local_temp, remote_temp)
                        else: final_temp = round((local_temp + remote_temp) / 2, 2)
            except: pass
        self.current_temp = final_temp

    def write_status(self):
        if int(time.time()) % 10 == 0:
            self.settings = self.load_settings()

        local_c = 0
        if self.sensor_adt: local_c = self.sensor_adt.temperature
        elif self.sensor_bme: local_c = self.sensor_bme.temperature - 2.0
        local_temp = round((local_c * 9/5) + 32, 2)
        
        remote_temp = None
        if self.remote_active and os.path.exists(REMOTE_FILE):
            try:
                with open(REMOTE_FILE, "r") as f: remote_temp = json.load(f).get("temp")
            except: pass
        
        current_deadband = self.get_core_deadband()
        if self.eco_mode: current_deadband = self.calculate_eco_deadband()

        data = {
            "mode": self.mode,
            "fan_mode": self.fan_mode,
            "eco_mode": self.eco_mode,
            "active_call": self.active_call,
            "temp": self.current_temp,
            "local_temp": local_temp,
            "remote_temp": remote_temp,
            "outside_temp": self.outside_temp,
            "forecast_temp": self.forecast_temp, 
            "heat_loss": self.heat_loss_rate,
            "target": self.target_temp,
            "humidity": self.humidity,
            "pressure": self.pressure,
            "gas": self.gas,
            "iaq": self.iaq_score,
            "active": self.is_active,
            "locked_out": self.locked_out,
            "short_cycle": self.short_cycle_alert,
            "current_deadband": current_deadband,
            "filter_hours": self.settings.get("filter_current_hours", 0),
            "filter_max": self.settings.get("filter_max_hours", 300),
            "remote_active": self.remote_active,
            "reboot_pending": self.reboot_pending,
            "last_reboot_at": self.booted_at,
            "next_reboot_due_at": calculate_next_reboot_due_at(
                self.settings,
                started_at=self.booted_at,
            ),
            
            # RUNTIME METRICS (NEW)
            "run_start": self.current_run_start,
            "last_duration": self.last_run_duration,
            "last_end": self.last_run_end,
            
            "read_only": False,
            "timestamp": time.time()
        }
        with open(STATUS_FILE, "w") as f: json.dump(data, f)

    def save_history(self):
        try:
            conn = sqlite3.connect(DB_FILE, timeout=30)
            c = conn.cursor()
            action = "IDLE"
            if self.is_active:
                action = self.active_call or self.mode
            
            c.execute("INSERT INTO history VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
                     (time.time(), self.current_temp, self.humidity, self.pressure, self.gas, self.target_temp, action, self.outside_temp))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"DB Save Error (Ignored): {e}")

    # ---------------- LOGIC LOOP ----------------
    def _relay(self, pin, state):
        GPIO.output(pin, GPIO.HIGH if state else GPIO.LOW)

    def start_call(self, call):
        if call == "COOL":
            self._relay(self.PIN_COOL, True)
        elif call == "HEAT":
            self._relay(self.PIN_HEAT, True)
        else:
            return

        self.is_active = True
        self.active_call = call
        self.record_cycle_start()

    def stop_active_call(self):
        if self.active_call == "COOL":
            self._relay(self.PIN_COOL, False)
            self.save_lockout()
        elif self.active_call == "HEAT":
            self._relay(self.PIN_HEAT, False)
        else:
            return

        self.is_active = False
        self.record_cycle_end()
        self.active_call = None

    def all_off(self):
        handle_active_system_stop(
            active_call=self.active_call,
            is_active=self.is_active,
            on_cycle_end=self.record_cycle_end,
            on_cooling_stop=self.save_lockout,
        )
        self._relay(self.PIN_COOL, False)
        self._relay(self.PIN_HEAT, False)
        self.is_active = False
        self.active_call = None

    def update_auto_reboot_state(self, now):
        self.reboot_pending = is_auto_reboot_due(
            self.settings,
            started_at=self.booted_at,
            now=now,
        )

    def maybe_auto_reboot(self, now):
        if not should_attempt_idle_reboot(
            reboot_due=self.reboot_pending,
            is_active=self.is_active,
            last_attempt_at=self.last_reboot_attempt,
            now=now,
            retry_delay_seconds=60,
        ):
            return

        self.last_reboot_attempt = now
        print("Auto reboot due and HVAC is idle. Requesting Raspberry Pi reboot.")
        try:
            subprocess.run(["sudo", "-n", "reboot"], check=True)
        except (OSError, subprocess.CalledProcessError) as e:
            print(f"Auto Reboot Error: {e}")
            return

        raise SystemExit("Auto reboot requested")

    def logic_loop(self, elapsed_seconds):
        self.load_control()
        self.get_readings()
        self.update_heat_loss_rate()

        if self.is_active:
            self.update_filter_hours(elapsed_seconds)

        active_target = self.target_temp
        active_hysteresis = self.get_core_deadband()
        
        if self.eco_mode:
            active_hysteresis = self.calculate_eco_deadband()
            if self.mode == "COOL": active_target += 2
            if self.mode == "HEAT": active_target -= 2
            if self.mode == "HEAT" and self.forecast_temp and self.outside_temp:
                if (self.forecast_temp > self.outside_temp + 3) and (self.current_temp > 64):
                    active_target -= 1 
            if self.mode == "HEAT" and self.check_smart_recovery():
                active_target = self.target_temp 

        self.locked_out = False 

        if self.mode == "OFF":
            if self.is_active:
                self.all_off()

        elif self.mode == "COOL":
            if (time.time() - self.last_ac_time) < self.CYCLE_DELAY:
                self.locked_out = True

            if self.current_temp > (active_target + active_hysteresis):
                if not self.is_active and not self.locked_out:
                    self.start_call("COOL")
            
            elif self.current_temp < (active_target - active_hysteresis):
                if self.active_call == "COOL":
                    self.stop_active_call()
        
        elif self.mode == "HEAT":
            if self.current_temp < (active_target - active_hysteresis):
                if not self.is_active:
                    self.start_call("HEAT")
            
            elif self.current_temp > (active_target + active_hysteresis):
                if self.active_call == "HEAT":
                    self.stop_active_call()

        elif self.mode == "AUTO":
            low_threshold = active_target - active_hysteresis
            high_threshold = active_target + active_hysteresis

            if self.active_call == "COOL":
                if self.current_temp < low_threshold:
                    self.stop_active_call()
            elif self.active_call == "HEAT":
                if self.current_temp > high_threshold:
                    self.stop_active_call()
            else:
                if self.current_temp > high_threshold:
                    if (time.time() - self.last_ac_time) < self.CYCLE_DELAY:
                        self.locked_out = True
                    else:
                        self.start_call("COOL")
                elif self.current_temp < low_threshold:
                    self.start_call("HEAT")

        fan_should_be_on = False
        if self.fan_mode == "ON": fan_should_be_on = True
        elif self.mode == "COOL" and self.is_active: fan_should_be_on = True
        elif self.mode == "HEAT" and self.is_active and self.FAN_ON_HEAT: fan_should_be_on = True

        self._relay(self.PIN_FAN, fan_should_be_on)
        self.update_auto_reboot_state(time.time())
        self.write_status()
        self.maybe_auto_reboot(time.time())
    
    def cleanup(self):
        self._relay(self.PIN_FAN, False)
        self.all_off()
        GPIO.cleanup()

def run():
    tstat = SmartThermostat()
    last_history_time = 0
    last_loop_time = time.time()
    print("Thermostat Engine Started.")
    try:
        while True:
            loop_started = time.time()
            elapsed_seconds = loop_started - last_loop_time
            last_loop_time = loop_started

            tstat.logic_loop(elapsed_seconds)
            if time.time() - last_history_time > 60:
                tstat.save_history()
                last_history_time = time.time()
            elapsed_runtime = time.time() - loop_started
            time.sleep(max(0, LOOP_INTERVAL - elapsed_runtime))
    except KeyboardInterrupt: pass
    finally: tstat.cleanup()

if __name__ == "__main__":
    run()
