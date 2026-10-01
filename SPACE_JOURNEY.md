# Rocket journey prototype

## Safe checkpoint

The pre-space observatory UI, Incident Command workspace, and architecture stack are preserved in commit `b14c9bcf9ee6096ae3e572eff956f91639ed5e27` on `origin/feature/upgrade`.

Message: `[vedanth] checkpoint interactive project workspace and architecture stack view`.

The space experiment was restored after that commit and is intentionally uncommitted. The original prototype also remains recoverable in safety stash `38e9fbe37707a2487b896992deb63ca2b69cb0cb`. Do not drop it until the owner accepts the new experience. Personal data.json and rotating-backup changes were excluded from the checkpoint.

## Run

Start the existing `run.bat` and open `http://127.0.0.1:8642/`. Choose **Space journey** if a bookmarked project is open. Hard-refresh after rebuilding. The homepage offers launch, library, practice, approach, and project-station stops; all work screens remain directly reachable from the sidebar.

## Assets and motion

- Actual GLB rocket parts from Kenney's original Space Kit download (CC0), assembled and relit at runtime. Asset licence and public credits ship under `/space/`.
- Earth and Mars textures from Solar System Scope (CC BY 4.0); the Earth WebP distribution is separately credited. No application code from the reference portfolio was copied.
- Time-driven shader exhaust, engine light, gentle craft attitude, and planet rotation. Idle animation is capped at 30fps, stops with Quiet/device reduced motion, and pauses when hidden, offscreen, or behind the reader. Pointer parallax is mouse-only.
- Scroll maps reversibly to camera travel through a real 3D docking aperture. No intercepted wheel events or forced scroll snapping.
- Existing robots/companions remain on work screens. The 3D scene is disposed when those screens open.

## Verify

From `app-src`: `npm run build`, `npm run lint`, `npm run test:project`, `npm run test:flight`.

Browser tests require Playwright and a local test server on port 8643. `tests/space-journey.browser.mjs` checks camera stops, assets, live animation, motion preferences, direct work navigation, mobile layout, and WebGL fallback. `tests/incident-workspace.browser.mjs` checks persistence and completion behavior. Both intercept `/api/data` in memory; they do not write the real progress file.

This remains a prototype, not a reproduction of the reference site. Real-device GPU performance and the feel of scroll/exhaust motion still need owner review. Existing bundle-size and sound.js lint warnings remain.
