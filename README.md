# PyThermostat: Pro-Grade DIY Smart Thermostat

A professional-grade, open-source smart thermostat built with **Python (FastAPI)** and **React**. Designed to run on a Raspberry Pi, this system offers standard HVAC control plus advanced "Eco Intelligence" features typically found in high-end devices like Nest or Ecobee.

![Status](https://img.shields.io/badge/Status-Stable-green)
![Tech](https://img.shields.io/badge/Stack-Python%20%2B%20React-blue)

## 🚀 Features

*   **Complete HVAC Control:** Supports 24V Heating, Cooling, and Fan systems (Split Systems).
*   **Safety First:** Built-in compressor short-cycle protection (5-minute lockout).
*   **Eco Intelligence Engine:**
    *   **Weather Aware:** Pulls local forecast data (Open-Meteo) to adjust settings dynamically.
    *   **Smart Hysteresis:** Widens the temperature swing on mild days to save energy.
    *   **Heat Loss Analysis:** Calculates your home's insulation efficiency in real-time.
    *   **Predictive Recovery:** Pre-heats the home before you wake up based on heat-gain calculations.
*   **Detailed Analytics:**
    *   24-hour temperature, humidity, and runtime graphs.
    *   Energy Cost Estimator (configurable kWh/Therm rates).
    *   Filter Health tracking.
*   **Air Quality Monitoring:** Tracks IAQ (Indoor Air Quality) using the BME680 sensor (VOCs + Humidity).
*   **Remote Sensors:** Supports external wireless temperature sensors (via HTTP) for multi-room averaging or "Max Comfort" mode.
*   **Modern UI:** A beautiful, dark-mode React dashboard with a "View Only" mode for guest users.

## 🛠️ Hardware Requirements

*   **Raspberry Pi:** 3B+ or 4 recommended (The Brain).
*   **Relay Hat:** Keyestudio 4-Channel Relay Hat (or generic 5V relay module).
*   **Sensors:**
    *   **BME680** (I2C) - For Temp, Humidity, Pressure, Air Quality.
    *   **ADT7410** (I2C) - Optional, for high-precision temperature.
*   **Power:** 24VAC to 5VDC Buck Converter (To power the Pi directly from the HVAC C-wire).

## 📊 Wiring Guide

**⚠️ WARNING:** HVAC systems use 24V AC. Touching the `R` (Power) and `C` (Common) wires together will short your transformer and blow a fuse in your furnace. **Turn off the breaker before wiring.**

### Relay Mapping
| Relay Channel | GPIO Pin (BCM) | HVAC Wire Color | Function |
| :--- | :--- | :--- | :--- |
| **Relay 1** | GPIO 4 | **Green (G)** | Fan Blower |
| **Relay 2** | GPIO 22 | **Yellow (Y)** | AC Compressor |
| **Relay 3** | GPIO 6 | **White (W)** | Furnace Heat |
| **COM Ports** | - | **Red (R)** | 24V Power Source |

### Sensor Wiring (I2C)
*   **SDA** -> GPIO 2
*   **SCL** -> GPIO 3
*   **VCC** -> 3.3V
*   **GND** -> GND

## 🔧 Installation Guide

### 1. System Prep
Enable I2C on your Raspberry Pi:
```bash
sudo raspi-config
# Interface Options -> I2C -> Enable
```

### 2. Backend Setup
Clone the repo and install Python dependencies:
```bash
git clone https://github.com/Hounderd/smart-thermostat.git
cd smart-thermostat
pip3 install fastapi uvicorn RPi.GPIO adafruit-circuitpython-bme680 adafruit-circuitpython-adt7410 requests
```

### 3. Frontend Setup
Build the React application:
```bash
cd smart-thermostat
npm install
npm run build
```

### 4. Process Management (PM2)
Use PM2 to keep the thermostat running in the background:
```bash
# Install PM2
sudo npm install -g pm2

# Start the Logic Core
pm2 start thermostat.py --interpreter python3

# Start the Web Server
pm2 start "uvicorn api:app --host 0.0.0.0 --port 8000" --name thermostat-api

# Save so it starts on reboot
pm2 save
```

## ⚙️ Configuration
You can customize the system behavior in `settings.json` (or via the Analytics Dashboard UI):
```json
{
    "cost_kwh": 0.14,
    "cost_therm": 1.10,
    "ac_kw": 3.5,
    "furnace_btu": 80000,
    "filter_max_hours": 300,
    "eco_hysteresis_mild": 3.0,
    "eco_hysteresis_strict": 0.5
}
```

## 🔒 Security
The API includes middleware that detects the visitor's IP address.
*   **Local Network (192.168.x.x):** Full Control.
*   **External Network:** Read-Only Mode (View settings, but cannot change them).

## 📝 License
MIT License. Created by Hounderd.
