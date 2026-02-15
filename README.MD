# 🏙️ CityQuest — Real-World Exploration RPG

**A Next-Generation Location-Based RPG for Runners.**

CityQuest gamifies real-world running by turning your city into a fog-covered map waiting to be explored. Players unlock districts, collect supply drops, and compete on global leaderboards by physically running in the real world.

## ✨ Core Functionalities

### 🗺️ Exploration & Fog of War
*   **Real-World Mapping**: Your city is your playground. The map is covered in a "Fog of War" that only clears when you physically run through it.
*   **District Control**: Conquer city districts by exploring their area. Each district has a completion percentage.
*   **Voronoi Districting**: Dynamic district generation using Voronoi diagrams for organic boundaries.

### 📦 Gameplay Mechanics
*   **Supply Drops**: Daily location-based loot boxes appear on the map. Run to their location to collect rewards.
*   **Inventory System**: Collect items and manage your gear.
*   **Stats & Progression**: Track your distance, speed, and calories. Level up your runner profile.

### 🏆 Social & Competitive
*   **Leagues**: Weekly competitive leagues with promotions and relegations based on your activity.
*   **Real-Time Multiplayer**: See other runners on the map in real-time (optional).
*   **Leaderboards**: Compete globally or against friends.

## � How to Play

### Getting Started
1.  **Open the App**: Launch CityQuest in your browser (mobile recommended).
2.  **Grant Permissions**: Allow location access to track your movement.
3.  **Start Running**: Press "Start Run" and move!

### Gameplay Loop
*   **Clear Fog**: Run new routes to reveal the map.
*   **Collect Drops**: Look for blue supply drop markers and run to them.
*   **Conquer Districts**: Focus your runs in specific neighborhoods to reach 100% exploration.

## 🏗️ Architecture & Technology

### Frontend Architecture
The application follows a component-based architecture using React and modern hooks:
*   **State Management**: `Zustand` for global app state (User, Location, Game Data).
*   **Routing**: `React Router` for navigation.
*   **Maps**: `React-Leaflet` and `D3-Delaunay` for map rendering and spatial calculations.

### Tech Stack
*   **Frontend**: HTML5, CSS3 (TailwindCSS), TypeScript, React, Vite
*   **Backend**: Supabase (Auth, PostgreSQL, Realtime, Edge Functions)
*   **PWA**: Fully installable Progressive Web App (Service Workers, Manifest)
*   **Performance**: Hardware-accelerated map rendering, optimistic UI updates.

## 📂 File Structure

```
src/
├── components/         # Reusable UI components (Buttons, Cards, HUD)
├── screens/           # Main application screens (Map, Profile, Inventory)
├── state/             # Zustand stores (useGameStore, useLocationStore)
├── services/          # API services (Supabase client, Location tracking)
├── hooks/             # Custom React hooks
├── data/              # Static game data (Items, Achievements)
├── utils/             # Helper functions (Geometry, Formatting)
└── App.tsx            # Main application entry
```

## 🔧 Installation & Setup

### Local Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/city-quest.git
    cd city-quest
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment**
    *   Copy `.env.example` to `.env.local`
    *   Fill in your Supabase credentials (see `SUPABASE_SETUP.md`)

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

### Cloud Hosting
The app is optimized for deployment on Vercel or Netlify. Ensure your build settings are:
*   **Build Command**: `npm run build`
*   **Output Directory**: `dist`

## 📱 Technical Specifications

*   **Browser Support**: Chrome (Mobile/Desktop), Safari (iOS), Firefox, Edge.
*   **Mobile-First**: Designed specifically for mobile viewports and touch interaction.
*   **Offline Capable**: PWA support allows for basic functionality in low-connectivity areas.

## ⚠️ COPYRIGHT NOTICE

**© 2024-2026 Stefko Nikolaev. All Rights Reserved.**

The source code, design, and assets in this repository are the proprietary property of the author.

While this repository is public, **NO LICENSE** is granted for use.
*   **You may** view this code for educational purposes.
*   **You may NOT** use, copy, modify, distribute, or sell copies of this software.
*   **You may NOT** use this code for commercial purposes or to build a competing product.

For inquiries, please contact: [stefkonikolaev3@gmail.com]