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
1.  **Floating Controls:** Minimalist UI overlay on the map.
2.  **Stats:** display:
    * Distance covered (in km).
    * "Exploration Score" (simple counter of unique coordinate points or area revealed).
3.  **Reset/Clear Data:** A setting to reset the "Fog" (for testing purposes).

## 4. Technical Constraints & Edge Cases
* **Mobile First:** The UI must be optimized for mobile screens (touch targets, bottom navigation).
* **GPS Noise:** Implement a basic filter to ignore GPS jumps (e.g., if a point is > 50 meters away in 1 second, ignore it).
* **Offline Capability:** Since it's a PWA, ensure the app doesn't crash if the network is spotty (Leaflet handles caching automatically to some extent).

## 5. Step-by-Step Implementation Guide for Cursor
1.  Initialize the Vite + React + Tailwind project.
2.  Set up the Leaflet map component.
3.  Implement the "Fog" overlay system (Canvas layer preferred for performance).
4.  Implement the Geolocation hook to track user position.
5.  Connect the position updates to the "Fog erasing" logic.
6.  Add `localStorage` saving/loading of the revealed paths.
7.  Style the UI for mobile.

## 6. Design Vibe
* **Theme:** Dark Mode / Cyberpunk aesthetic.
* **Colors:** Dark background, Neon Green/Blue for the runner's path.
* **Feel:** Like a strategy game (StarCraft/Age of Empires) but for real-world running.