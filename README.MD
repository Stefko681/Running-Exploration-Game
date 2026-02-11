# Project: City Fog of War (Running Exploration Game)

## 1. Project Overview
We are building a mobile-first web application (PWA) designed for runners in Sofia, Bulgaria. The core concept is "Gamified Exploration."
Instead of just tracking stats, the user sees the map of the city covered in "Fog of War" (dark overlay). By running (moving with GPS), the user "reveals" the map, clearing the fog along their path.

**Goal:** Motivate users to run in new neighborhoods and streets rather than repeating the same loops.

## 2. Tech Stack (Strict Requirements)
To ensure rapid development and stability, use the following stack:
* **Framework:** React (Latest version) with Vite.
* **Language:** TypeScript (preferred) or JavaScript.
* **Styling:** Tailwind CSS (for mobile-responsive UI).
* **Maps:** `react-leaflet` and `leaflet` (OpenStreetMap tiles). **DO NOT use Google Maps API** (to avoid API keys/billing).
* **State Management:** React Context API or Zustand.
* **Persistence:** `localStorage` (for the MVP, we will save the user's revealed paths locally on the device).
* **Icons:** Lucide-React.

## 3. Core Features (MVP)

### A. The Map & Fog Layer
1.  **Base Map:** Load OpenStreetMap centered on Sofia, Bulgaria by default (or user's current position).
2.  **Fog of War Logic:**
    * The map should be covered by a semi-transparent dark overlay (e.g., black with 0.7 opacity).
    * This overlay represents the "unexplored" territory.
3.  **Revealing Logic:**
    * As the user moves, their path should "erase" the fog.
    * Visually, this can be achieved by drawing a thick, transparent polyline on the Fog layer or using a Canvas overlay on top of the map that acts as a mask.
    * The "revealed" area should remain revealed permanently (persisted in storage).

### B. GPS Tracking
1.  **"Start Run" Button:** A prominent button to begin tracking.
2.  **Real-time Updates:** Use the browser's Geolocation API (`navigator.geolocation.watchPosition`) to track movement.
3.  **Path Drawing:** Draw a distinct line (e.g., bright neon color) showing the *current* run's path on top of the map.

### C. Dashboard / UI
1.  **Floating Controls:** Minimalist HUD overlay on the map with GPS state and accuracy.
2.  **Stats:** display:
    * Distance covered (in km).
    * "Exploration Score" (simple counter of unique coordinate points or tiles revealed).
3.  **History Screen:** Tab with a list of past runs (distance, time, number of track points) with options to export/import data and share a run summary.
4.  **Reset/Clear Data:** A setting to reset the "Fog" and history (for testing purposes or starting fresh).

## 4. Technical Constraints & Edge Cases
* **Mobile First:** The UI must be optimized for mobile screens (touch targets, bottom navigation).
* **GPS Noise:** Implement a basic filter to ignore GPS jumps (e.g., if a point is > 50 meters away in 1 second, ignore it).
* **Offline Capability:** Since it's a PWA, ensure the app doesn't crash if the network is spotty (Leaflet handles caching automatically to some extent).

### 4.1 Tunable constants

Gameplay / GPS thresholds live in `src/config.ts`:

- `GPS_MAX_SPEED_M_PER_S` – GPS jumps faster than this are ignored.
- `GPS_MIN_STEP_METERS` – micro-movements below this distance are ignored.
- `FOG_BRUSH_RADIUS_PX` and `FOG_OPACITY` – control how thick the cleared path is and how dense the fog looks.

## 5. Step-by-Step Implementation Guide for Cursor
1.  Initialize the Vite + React + Tailwind project.
2.  Set up the Leaflet map component.
3.  Implement the "Fog" overlay system (Canvas layer preferred for performance).
4.  Implement the Geolocation hook to track user position.
5.  Connect the position updates to the "Fog erasing" logic.
6.  Add `localStorage` saving/loading of the revealed paths.
7.  Style the UI for mobile.
8.  Add a `History` tab for run summaries powered by Zustand state and `localStorage`.
9.  Add export/import of `revealed` tiles and `runs` as JSON for backup or device migration.
10. Add a share action that copies a text summary of a run (distance, duration, number of points) to the clipboard / native share sheet.

## 6. Design Vibe
* **Theme:** Dark Mode / Cyberpunk aesthetic.
* **Colors:** Dark background, Neon Green/Blue for the runner's path.
* **Feel:** Like a strategy game (StarCraft/Age of Empires) but for real-world running.

---

## 7. How to use the app (as a runner)

1. Open the app on **mobile** (recommended) and allow location permissions when prompted.
2. On the **Map** tab:
   - Tap **Start run** and start running; your live path glows on the map.
   - The dark fog is erased along your route and stays revealed on this device.
   - The HUD at the top shows distance, exploration score and GPS status.
3. When you are done, tap **Stop** – the run is saved to the **History** tab.
4. In the **History** tab you can:
   - Review past runs (distance, duration, number of points).
   - **Export** your data to a JSON file (backup/transfer).
   - **Import** previously exported JSON to restore your fog and history.
   - **Share** a textual summary of a run via clipboard/native share.

### Installing as a PWA

- On mobile Chrome/Edge:
  - Open the app URL, then use **Add to Home screen** from the browser menu.
- On iOS Safari:
  - Open the app URL, tap **Share** → **Add to Home Screen**.
- Once installed, the app runs full-screen with its own icon (uses `public/pwa.svg`).

## 8. How to run (local dev)

### Prerequisites
- Install **Node.js (LTS)** and **npm**.

On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y nodejs npm
node -v
npm -v
```

### Install & start
From the project root:
```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

### GPS notes   
- Geolocation works best on **mobile** and on **HTTPS** (or `localhost`).
- On desktop, you may need to allow location permissions in the browser.

### Build / preview
```bash
npm run build
npm run preview
```