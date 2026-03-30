import os
import unittest

from api import frontend_path, resolve_frontend_request_path


class FrontendPathTests(unittest.TestCase):
    def test_frontend_path_points_to_nested_vite_dist_directory(self):
        dist_dir = frontend_path()

        self.assertTrue(dist_dir.endswith(os.path.join("smart-thermostat", "dist")))

    def test_frontend_path_joins_nested_assets(self):
        asset_path = frontend_path("assets")

        self.assertTrue(asset_path.endswith(os.path.join("smart-thermostat", "dist", "assets")))

    def test_resolve_frontend_request_path_rejects_parent_directory_traversal(self):
        self.assertIsNone(resolve_frontend_request_path("../api.py"))

    def test_resolve_frontend_request_path_rejects_absolute_paths(self):
        self.assertIsNone(resolve_frontend_request_path("/etc/passwd"))


if __name__ == "__main__":
    unittest.main()
