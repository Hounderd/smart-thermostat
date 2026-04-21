# Remote Thermostat Handoff

Date: 2026-04-21
Worktree: `C:\Users\Hound\Desktop\smart-thermostat\.worktrees\remote-hardening`
Branch: `feature/remote-hardening`

## Summary

This branch hardens the remote thermostat input path while preserving the preferred runtime behavior of averaging the local and trusted remote temperatures across all modes.

The final behavior is:

- `POST /remote` requires `X-Remote-Token` matching `REMOTE_SENSOR_TOKEN`
- Remote payloads are validated before they are written
- Remote samples are trusted only when they are fresh, readable, in range, and not an outlier versus the local sensor
- When the remote sample is trusted, `HEAT`, `COOL`, and `AUTO` all use the average of the local and remote temperatures
- When the remote sample is stale, malformed, out of range, or rejected as an outlier, control falls back to the local sensor only

## Files Changed

- `.gitignore`
- `README.md`
- `api.py`
- `settings.json.example`
- `smart-thermostat/src/pages/Analytics.jsx`
- `thermostat.py`
- `tests/test_remote_api.py`
- `tests/test_remote_control_logic.py`

## What Changed

### API hardening

In `api.py`:

- Added `REMOTE_SENSOR_TOKEN` enforcement for `POST /remote`
- Added explicit `X-Remote-Token` validation
- Added temperature validation for remote payloads
  - finite only
  - `20F` to `100F`
- Extended `SystemSettings` schema with:
  - `remote_max_delta`
  - `remote_sample_max_age_seconds`

### Runtime hardening

In `thermostat.py`:

- Added remote trust evaluation helpers
- Added explicit remote trust metadata:
  - `remote_status`
  - `remote_reason`
  - `remote_temp`
  - `local_temp`
- Added settings-backed trust gates:
  - `remote_max_delta` default `15.0`
  - `remote_sample_max_age_seconds` default `300.0`
- Added fail-closed fallback to local-only control when remote data is rejected

### Final control policy

The first pass of this branch changed control to prioritize the most uncomfortable zone. That was later reverted by request.

The final policy now uses trusted averaging in all modes:

- trusted remote present:
  - `effective_heat_temp = average(local_temp, remote_temp)`
  - `effective_cool_temp = average(local_temp, remote_temp)`
  - `current_temp = trusted average`
- remote not trusted:
  - all effective temps fall back to `local_temp`

This means `HEAT`, `COOL`, and `AUTO` all react to the same blended indoor value once the remote sample is accepted.

## Documentation and Config Updates

In `README.md`:

- documented the remote token requirement
- documented stale/outlier rejection
- documented the restored trusted-average control behavior

In `settings.json.example`:

- added the missing thermostat settings that are now relevant to this branch
- added the new remote trust settings

In `smart-thermostat/src/pages/Analytics.jsx`:

- added defaults for the new remote settings so a settings save does not drop them from the backend config

## Verification Evidence

Python verification:

```text
python -m unittest discover -s tests -v
Ran 13 tests in 0.038s
OK
```

Frontend verification:

```text
npm install
npm run build
vite build ... built successfully
```

## Deployment Notes

The repo README shows a PM2-based deployment flow.

Expected deployment steps on the Raspberry Pi:

1. Update the Pi repo to this branch state
2. Ensure backend Python dependencies are present
3. In `smart-thermostat/`, run:
   - `npm install` if needed
   - `npm run build`
4. Set `REMOTE_SENSOR_TOKEN` for the API process environment
5. Restart:
   - `pm2 restart thermostat`
   - `pm2 restart thermostat-api`

The remote sender must now include:

- header: `X-Remote-Token: <same token as REMOTE_SENSOR_TOKEN>`

## Cleanup Status

Successful cleanup:

- removed generated `remote.json`
- removed visible `__pycache__` artifacts

Remaining cleanup blocker:

- Several root-level `tmp*` directories remain in the worktree
- They were created during test-harness iteration and are not source artifacts
- This shell could not delete them due Windows ACL/ownership restrictions, even with escalated attempts
- They are now ignored via `.gitignore` as `tmp*/` so they should stop polluting normal git workflows

If you want them physically deleted, the most likely working path is to remove them from a local shell running as the original owner or an elevated admin account.

## Suggested Next Step

Before deploying to the Pi:

- review the diff
- commit the branch
- deploy from the committed branch state rather than syncing this worktree directly
