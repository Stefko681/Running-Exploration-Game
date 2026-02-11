# City Fog of War 🏃‍♂️🗺️

**Gamified Urban Exploration for Runners**

City Fog of War is a mobile-first Progressive Web Application (PWA) that turns your city into a game board. Inspired by RTS games like StarCraft, the map starts covered in a "Fog of War." As you run, track your GPS location to "reveal" the map, clearing the fog along your path.

**Goal:** Motivate runners to explore new neighborhoods and streets rather than repeating the same routes.

---

## 🚀 Features

*   **Real-time Fog of War**: A dynamic canvas overlay that permanently clears as you move.
*   **GPS Tracking**: Tracks your current run with high accuracy, filtering out GPS noise and jitter.
*   **Persistent Progress**: Your "revealed" map is saved locally on your device and persists between sessions.
*   **History & Stats**: detailed history of past runs including distance, time, and exploration points.
*   **Privacy First**: All data is stored locally in your browser (`localStorage`). No external servers receive your location data.
*   **PWA Ready**: Installable on iOS and Android for a native app-like experience with offline capabilities.
*   **Data Export/Import**: Backup your exploration progress to a JSON file or transfer it to another device.

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Build Tool**: Vite
*   **Mapping**: Leaflet, React-Leaflet, OpenStreetMap
*   **Styling**: Tailwind CSS
*   **State Management**: Zustand
*   **Icons**: Lucide React

## 📱 How to Install (PWA)

**iOS (Safari)**
1.  Open the app in Safari.
2.  Tap the **Share** button.
3.  Scroll down and tap **"Add to Home Screen"**.

**Android (Chrome)**
1.  Open the app in Chrome.
2.  Tap the menu (three dots).
3.  Tap **"Install App"** or **"Add to Home screen"**.

## 🏃 Usage

1.  **Start**: Open the app and grant location permissions.
2.  **Run**: Tap "Start Run." Your path will glow neon blue, clearing the fog.
3.  **Explore**: Try to run through dark areas to reveal them!
4.  **Stop**: When finished, tap "Stop." Your run is saved to the History tab.

## 💻 Local Development

### Prerequisites
*   Node.js (LTS recommended)
*   npm

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Building for Production

```bash
npm run build
npm run preview
```

## ⚙️ Configuration

Key gameplay constants can be tweaked in `src/config.ts`:

*   `GPS_MIN_STEP_METERS`: Threshold to ignore small GPS jitters (default: 5m).
*   `GPS_MAX_SPEED_M_PER_S`: Speed limit to ignore GPS teleports.
*   `FOG_BRUSH_RADIUS_PX`: Width of the path cleared in the fog.

## 📄 License

MIT