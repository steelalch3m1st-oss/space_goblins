# 🚀 Space Shift: Outpost

### Explore Space. Make Decisions. Discover Science.

**An interactive educational browser game for children aged 7–12, developed by Team Space Goblins for NASA Space Apps Challenge Kyiv 2026.**

Space Shift: Outpost puts players in charge of planning astronaut activities, managing limited resources, and solving challenges inspired by real space exploration.

Our goal is simple: **turn scientific knowledge into an experience where every decision matters.**

## 🎮 Play the Game

**[🚀 Launch Space Shift: Outpost](https://steelalch3m1st-oss.github.io/space_goblins/)**

Play directly in your browser. No installation, registration, or special equipment required.

Available in **English and Ukrainian**.

## 🪐 Three Missions. Three Scientific Challenges.

### 🛰️ International Space Station
**Risk Assessment and Responsible Planning**

Plan scientific activities aboard the ISS while managing a simplified radiation exposure budget.

Learn why astronaut safety and scientific productivity must be carefully balanced.

### 🌕 Apollo 11
**Time Management and Limited Resources**

Organize lunar surface activities while considering task order, spacesuit resources, and departure deadlines.

Learn how prioritization and efficient planning contribute to mission success.

### 🔴 CHAPEA
**Communication Delays and Autonomous Decisions**

Experience a simulated Mars mission inspired by NASA's CHAPEA research program.

Plan activities around a 40-minute round-trip communication delay and learn why astronauts on distant missions must make independent decisions.

*CHAPEA is an Earth-based NASA research program. Our Mars scenario is an educational simulation.*

Each mission includes **two playable days**, offering six days of interactive learning.

## 🧩 How It Works

**Briefing → Planning → Simulation → Scientific Explanation**

1. **Receive your mission:** Learn about the day's objectives and challenges from Mission Control.
2. **Create a plan:** Schedule astronaut activities while considering time, resources, and mission constraints.
3. **Run the simulation:** Watch your decisions unfold through pixel-art scenes, comics, and interactive mini-games.
4. **Discover the science:** Understand how your decisions affected the outcome and which scientific principles explain the results.

Mistakes are part of the learning process. Players can revise unsuccessful plans and try again.

## 🔬 Powered by NASA Science

The game draws on publicly available NASA scientific and educational resources, including:

- [NASA International Space Station](https://www.nasa.gov/international-space-station/)
- [NASA Apollo 11](https://www.nasa.gov/mission/apollo-11/)
- [Apollo Lunar Surface Journal](https://www.nasa.gov/history/alsj/)
- [NASA CHAPEA](https://www.nasa.gov/humans-in-space/chapea/)
- [NASA Science](https://science.nasa.gov/)
- [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/)

Scientific concepts are adapted for younger audiences. Resource values, radiation budgets, and selected mission parameters are simplified educational models, not actual NASA measurements or exact historical mission conditions.

For more information, see [NASA Data Sources](docs/DATA_SOURCES.md).

## 🎨 Features

- Monochrome pixel-art visuals and animated mission scenes.
- Interactive scheduling and resource management.
- Mini-games integrated into mission activities.
- Achievements and browser-based progress tracking.
- Mission Control audio messages.
- English and Ukrainian localization.
- Educational feedback connecting decisions with scientific principles.

## 💻 Technology

**HTML5 · CSS3 · Vanilla JavaScript · GitHub Pages**

The main game runs from a single `index.html` file, with standalone mini-games stored in the `minigames/` directory.

The project requires no backend, database, or build process.

## 🛠️ Run Locally

Clone the repository:

```bash
git clone https://github.com/steelalch3m1st-oss/space_goblins.git
cd space_goblins
```

Start a local HTTP server:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000/** in your browser.

On Windows, you can also use:

```powershell
powershell -File tools/serve.ps1 -Port 8000
```

A local HTTP server is recommended for reliable mini-game functionality.

## 👨‍🚀 Our Team

**Space Goblins** | 4 Team Members

@poisonacid
@marysyaishchenko-png
@dan2812
@steelalch3m1st-oss

**NASA Space Apps Challenge Kyiv 2026**

Challenge: *Junior Astronaut Mission Trainer*

---

### 🌌 Our Mission

We believe children understand science more deeply when they can experience its challenges, make their own decisions, and discover the consequences.

**Space Shift: Outpost transforms space exploration from something children learn about into something they learn through.**
