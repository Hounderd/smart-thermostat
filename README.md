# PyThermostat: Pro-Grade DIY Smart Thermostat

A professional-grade, open-source smart thermostat built with **Python (FastAPI)** and **React**. Designed to run on a Raspberry Pi, this system offers standard HVAC control plus advanced "Eco Intelligence" features typically found in high-end proprietary devices like Nest or Ecobee.

![Status](https://img.shields.io/badge/Status-Stable-green)
![Tech](https://img.shields.io/badge/Stack-Python%20%2B%20React-blue)
![DB](https://img.shields.io/badge/Database-SQLite-lightgrey)

---

Here is the fully assembled smart thermostat, alongside the internal wiring and structural design.

<p align="center">
  <img src="download.nodd.dev/thermostat_wall.jpg" width="45%" alt="Finished Smart Thermostat on Wall" />
  &nbsp;
  <img src="download.nodd.dev/internal_wiring.jpg" width="45%" alt="Internal Wiring & Relays" />
</p>

## Custom 3D Printed Enclosure (availble here)
A minimal 3D-printable case designed specifically to house the Raspberry Pi alongside the 4-Channel Relay Hat perfectly. 

<p align="center">
  <img src="download.nodd.dev/case_model.png" width="70%" alt="3D Printable Case Model" />
</p>

---

## 🚀 Features

*   **Complete HVAC Control:** Supports 24V Heating, Cooling, and Fan systems (Standard Split Systems).
*   **Safety First:** Built-in equipment protection (e.g., 5-minute compressor short-cycle lockout).
*   **Eco Intelligence Engine:**
    *   **Weather Aware:** Runs a background worker to fetch local forecast data (Open-Meteo) and adjust inside behavior dynamically.
    *   **Smart Hysteresis:** Widens the temperature swing on mild days to reduce rapid cycling and save energy.
    *   **Heat Loss Analysis:** Calculates your home's thermal efficiency in real-time based on runtime vs. outside temperature.
    *   **Predictive Recovery:** Pre-heats or pre-cools the home before you wake up based on empirical heat-gain calculations.
*   **Detailed Analytics & History:**
    *   Logs high-resolution HVAC events, temperature, humidity, and pressure to a local `history.db` SQLite database.
    *   Energy Cost Estimator (configurable kWh/Therm rates).
    *   Filter Health tracking based on active blower fan hours.
*   **Air Quality Monitoring:** Fully integrated support for the **BME680** sensor to calculate the IAQ (Indoor Air Quality) index using VOC gas resistance and humidity.
*   **Remote Sensors:** Supports external wireless temperature sensors via REST HTTP endpoints for multi-room averaging or "Max Comfort" modes.
*   **Modern UI:** A beautiful, responsive React dashboard with "Full Control" and "View-Only" guest modes.

## 🛠️ Hardware Requirements

*   **Raspberry Pi:** 3B+ or 4 recommended (The main logic core).
*   **Relay Module:** Keyestudio 4-Channel Relay Hat (or generic 5V relay module).
*   **Sensors (I2C):**
    *   **Adafruit BME680** - Measures Temperature, Humidity, Barometric Pressure, and VOC Gas.
    *   **Adafruit ADT7410** - *(Optional)* For high-precision temperature measurements.
*   **Power Supply:** 24VAC to 5VDC Buck Converter (Highly recommended to power the Pi directly from the HVAC's C-wire).

## 📊 Wiring Guide

**⚠️ WARNING:** HVAC systems use 24V AC. Touching the `R` (Power) and `C` (Common) wires together will short your transformer and blow a fuse in your furnace. **Always turn off the breaker before wiring.**

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
Enable the I2C interface on your Raspberry Pi:
```bash
sudo raspi-config
# Navigate: Interface Options -> I2C -> Enable
```

### 2. Backend Setup
Clone the repository and install the Python dependencies:
```bash
git clone https://github.com/Hounderd/smart-thermostat.git
cd smart-thermostat

# Install requirements
pip3 install fastapi uvicorn RPi.GPIO requests
pip3 install adafruit-circuitpython-bme680 adafruit-circuitpython-adt7410
```

### 3. Frontend Setup
Build the React web application:
```bash
cd smart-thermostat
npm install
npm run build
```

### 4. Process Management (PM2)
We highly recommend using PM2 to keep both the background logic daemon and the API server running resiliently:
```bash
# Install PM2 globally
sudo npm install -g pm2

# 1. Start the actual HVAC Logic Core
pm2 start thermostat.py --interpreter python3 --name thermostat-core

# 2. Start the FastAPI Web Server (serves React & API)
pm2 start "uvicorn api:app --host 0.0.0.0 --port 8000" --name thermostat-api

# Save the PM2 list so it restarts elegantly on reboot
pm2 save
pm2 startup
```

## ⚙️ Configuration
The system parameters can be customized directly in the Analytics Dashboard UI, or manually by editing `settings.json`:
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

## 🔒 Security & Access Control
The FastAPI app contains intelligent IP-blocking middleware:
*   **Local Network (192.168.x.x or 10.x.x.x):** Allowed full read/write Control.
*   **External Network (Port Forwarded/Proxy):** Downgraded to a Read-Only Mode automatically. Guests can view the status but cannot manipulate the temperature.

##
Created with ❤️ by [Hounderd](https://github.com/Hounderd).
