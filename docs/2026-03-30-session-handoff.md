# 2026-03-30 Session Handoff

## Repository State
- Repo: `C:\Users\Hound\Desktop\smart-thermostat`
- Raspberry Pi: `nod@192.168.1.234`
- Live repo path on Pi: `/home/nod/PyThermostat`
- PM2 process names: `thermostat`, `thermostat-api`
- Public repo: `Hounderd/smart-thermostat`

## Shipped Today
- Fixed dashboard control responsiveness.
  - API now merges pending control into `/status`.
  - Dashboard keeps optimistic control state and ignores stale status responses.
  - Thermostat loop now reacts every 1 second instead of 5.
- Hardened weather fetching with retries and consolidated errors.
- Persisted cooling compressor lockout across restarts without switching requested `COOL` mode to `OFF`.
- Added configurable idle-only Raspberry Pi auto reboot.
  - Settings: `auto_reboot_enabled`, `auto_reboot_hours`
  - Uses `sudo -n reboot`
  - Waits until HVAC is idle before rebooting
- Fixed frontend serving mismatch.
  - Root cause: Pi had both `/home/nod/PyThermostat/dist` and `/home/nod/PyThermostat/smart-thermostat/dist`
  - `thermostat-api` served the root `dist`, while Vite built the nested one
  - `api.py` now serves `smart-thermostat/dist` directly so deploys do not require manual copying

## Important Commits
- `9ce4fe9` Fix thermostat control responsiveness
- `e3a23a7` Harden weather fetch retries
- `d7fb22e` Add idle-only automatic Pi reboot setting

## PR / Git Workflow Decisions
- Use branch + PR flow for public repo changes.
- Do not patch `main` directly unless explicitly required.
- Do not use connector reactions on public PRs.
  - A connector bot reaction was added to PR `#1`
  - Attempts to remove it failed due GitHub permission restrictions

## Live Deployment Notes
- `thermostat-api` runs from `/home/nod/PyThermostat`
- It now serves frontend assets from `/home/nod/PyThermostat/smart-thermostat/dist`
- Standard Pi deploy flow should be:
  1. `cd /home/nod/PyThermostat && git pull origin main`
  2. `cd /home/nod/PyThermostat/smart-thermostat && npm run build`
  3. `pm2 restart thermostat thermostat-api`
  4. `pm2 save`
- Verified on Pi that `sudo -n reboot` works for user `nod`

## Verification Performed Today
- `python -m unittest tests.test_api_status`
- `python -m unittest tests.test_weather_fetch tests.test_api_status`
- `python -m unittest tests.test_cooling_lockout`
- `python -m unittest tests.test_auto_reboot tests.test_cooling_lockout tests.test_weather_fetch tests.test_api_status`
- `python -m unittest tests.test_frontend_paths tests.test_auto_reboot tests.test_cooling_lockout tests.test_weather_fetch tests.test_api_status`
- `python -m compileall api.py thermostat.py auto_reboot.py cooling_lockout.py weather_fetch.py`
- `npm run build`

## Known Non-Blocking Issues
- `npx eslint src/pages/Analytics.jsx` still reports pre-existing Analytics hook/component issues.
- Frontend build warns about a large JS chunk size.
- Public `temp.nodd.dev` may briefly serve stale cached frontend assets after deploys, even when Pi files are correct.

## Current Branching Context
- `main` currently contains the shipped idle-only reboot work.
- There is a new local branch for the frontend serving fix:
  - `feature/frontend-dist-source-of-truth`
- Future agent should verify whether that branch has been published/merged/deployed before assuming the live deploy path fix is complete.
