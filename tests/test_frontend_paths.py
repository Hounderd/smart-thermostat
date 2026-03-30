import os
import unittest

from api import frontend_path


class FrontendPathTests(unittest.TestCase):
    def test_frontend_path_points_to_nested_vite_dist_directory(self):
        dist_dir = frontend_path()

        self.assertTrue(dist_dir.endswith(os.path.join("smart-thermostat", "dist")))

    def test_frontend_path_joins_nested_assets(self):
        asset_path = frontend_path("assets")

        self.assertTrue(asset_path.endswith(os.path.join("smart-thermostat", "dist", "assets")))


if __name__ == "__main__":
    unittest.main()
