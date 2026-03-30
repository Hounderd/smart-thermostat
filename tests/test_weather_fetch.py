import unittest
from unittest.mock import Mock

from weather_fetch import WeatherFetchError, fetch_weather_snapshot


class FetchWeatherSnapshotTests(unittest.TestCase):
    def test_retries_transient_failures_and_eventually_returns_weather(self):
        first_error = TimeoutError("timeout")
        second_error = ConnectionError("temporary dns issue")

        success_response = Mock()
        success_response.raise_for_status.return_value = None
        success_response.json.return_value = {
            "current": {"temperature_2m": 76.5},
            "hourly": {"temperature_2m": [70.0, 71.0, 72.0, 73.0, 74.0, 75.0]},
        }

        request = Mock(side_effect=[first_error, second_error, success_response])

        result = fetch_weather_snapshot(
            request_get=request,
            sleep=lambda _: None,
            current_hour=2,
            retries=3,
            retry_delay_seconds=0.01,
        )

        self.assertEqual(3, request.call_count)
        self.assertEqual(76.5, result["outside_temp"])
        self.assertEqual((72.0 + 73.0 + 74.0) / 3, result["forecast_temp"])

    def test_raises_single_wrapped_error_after_all_retries_fail(self):
        request = Mock(side_effect=TimeoutError("still timing out"))

        with self.assertRaises(WeatherFetchError) as ctx:
            fetch_weather_snapshot(
                request_get=request,
                sleep=lambda _: None,
                current_hour=0,
                retries=3,
                retry_delay_seconds=0.01,
            )

        self.assertEqual(3, request.call_count)
        self.assertIn("still timing out", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
