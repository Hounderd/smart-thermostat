import datetime as dt
import time

import requests


LAT = 43.19
LON = -88.72
DEFAULT_TIMEOUT_SECONDS = 10
DEFAULT_RETRIES = 3
DEFAULT_RETRY_DELAY_SECONDS = 2


class WeatherFetchError(RuntimeError):
    pass


def build_weather_url(lat=LAT, lon=LON):
    return (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m"
        "&hourly=temperature_2m"
        "&temperature_unit=fahrenheit"
    )


def parse_weather_payload(payload, *, current_hour=None):
    current_hour = dt.datetime.now().hour if current_hour is None else current_hour
    outside_temp = payload["current"]["temperature_2m"]
    forecast_temp = None
    temps = payload.get("hourly", {}).get("temperature_2m", [])
    if len(temps) > current_hour + 3:
        forecast_temp = sum(temps[current_hour:current_hour + 3]) / 3

    return {
        "outside_temp": outside_temp,
        "forecast_temp": forecast_temp,
    }


def fetch_weather_snapshot(
    *,
    lat=LAT,
    lon=LON,
    request_get=None,
    sleep=None,
    current_hour=None,
    retries=DEFAULT_RETRIES,
    retry_delay_seconds=DEFAULT_RETRY_DELAY_SECONDS,
    timeout=DEFAULT_TIMEOUT_SECONDS,
):
    request_get = requests.get if request_get is None else request_get
    sleep = time.sleep if sleep is None else sleep
    last_error = None
    url = build_weather_url(lat=lat, lon=lon)

    for attempt in range(retries):
        try:
            response = request_get(url, timeout=timeout)
            response.raise_for_status()
            return parse_weather_payload(response.json(), current_hour=current_hour)
        except Exception as exc:
            last_error = exc
            if attempt < retries - 1:
                sleep(retry_delay_seconds)

    raise WeatherFetchError(f"Weather fetch failed after {retries} attempts: {last_error}")
