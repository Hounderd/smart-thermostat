import os
import unittest
from unittest.mock import mock_open, patch

from fastapi.testclient import TestClient

import api


class RemoteApiTests(unittest.TestCase):
    def setUp(self):
        self.original_token = os.environ.get("REMOTE_SENSOR_TOKEN")
        os.environ["REMOTE_SENSOR_TOKEN"] = "secret-token"
        self.client = TestClient(api.app)

    def tearDown(self):
        if self.original_token is None:
            os.environ.pop("REMOTE_SENSOR_TOKEN", None)
        else:
            os.environ["REMOTE_SENSOR_TOKEN"] = self.original_token

    def test_remote_post_rejects_missing_token(self):
        response = self.client.post("/remote", json={"temp": 72.0})

        self.assertEqual(response.status_code, 403)

    def test_remote_post_rejects_invalid_token(self):
        response = self.client.post(
            "/remote",
            json={"temp": 72.0},
            headers={"X-Remote-Token": "wrong-token"},
        )

        self.assertEqual(response.status_code, 403)

    def test_remote_post_requires_configured_server_token(self):
        os.environ.pop("REMOTE_SENSOR_TOKEN", None)

        response = self.client.post(
            "/remote",
            json={"temp": 72.0},
            headers={"X-Remote-Token": "secret-token"},
        )

        self.assertEqual(response.status_code, 503)

    def test_remote_post_accepts_valid_token_and_persists_value(self):
        captured = {}

        def capture_dump(payload, handle):
            captured["payload"] = payload

        with patch("builtins.open", mock_open()), patch.object(api.json, "dump", side_effect=capture_dump):
            response = self.client.post(
                "/remote",
                json={"temp": 72.0},
                headers={"X-Remote-Token": "secret-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured["payload"]["temp"], 72.0)
        self.assertIn("timestamp", captured["payload"])

    def test_remote_post_rejects_out_of_range_temperature(self):
        response = self.client.post(
            "/remote",
            json={"temp": 140.0},
            headers={"X-Remote-Token": "secret-token"},
        )

        self.assertEqual(response.status_code, 422)

    def test_remote_post_rejects_non_finite_temperature(self):
        response = self.client.post(
            "/remote",
            content='{"temp":"nan"}',
            headers={
                "Content-Type": "application/json",
                "X-Remote-Token": "secret-token",
            },
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
