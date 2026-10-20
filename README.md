# City Drive 3D, Milestone 1

Original low-poly driving sim built with Three.js and Vite. All visuals and sounds are procedural, so there are no external assets or licences to track.

## Windows setup
1. Install Node.js LTS (20 or newer) from https://nodejs.org, or run `winget install OpenJS.NodeJS.LTS` in PowerShell. Reopen the terminal afterwards.
2. Open PowerShell in this folder (Shift + right-click > "Open in Terminal").
3. `npm install`
4. `npm run dev` opens http://localhost:5173
5. Production build: `npm run build` creates `dist/`. Serve it with `npm run preview`.
   Do not open `dist/index.html` by double-click: browsers block ES modules over `file://`.

If PowerShell says scripts are disabled, run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`, or use Command Prompt instead.

## Controls
W/Up gas, S/Down brake then reverse, A D/arrows steer, Space handbrake, C camera (chase, hood, cockpit), H horn, P/Esc pause, R restart, M mute, G graphics preset (reloads). On touch screens, on-screen buttons appear automatically.

## Graphics presets (for 4 GB RAM PCs)
Low: 0.7x resolution, no antialiasing, no shadows, 8 traffic cars, short fog. Medium: native resolution, 14 cars. High: antialiasing, shadows, 20 cars. The whole city's buildings are one instanced draw call. Settings and coins are saved in localStorage under `cd3d`.

## Roadmap
M2: garage, 3 unlockable cars, upgrades, spending coins. M3: parking missions, more levels, traffic-violation penalties. M4: polish, settings menu, damage model.
