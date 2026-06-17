# EcoTrack — Carbon Footprint Awareness Platform

EcoTrack is a comprehensive, client-side web application designed to help individuals understand, track, and reduce their carbon footprint through personalized insights, actionable recommendations, and gamified challenges. 

This project was built as a solution for PromptWars Virtual Challenge 3.

## ✨ Features

*   **Carbon Footprint Calculator**: A multi-step wizard to estimate your annual CO₂ emissions based on transport, home energy, diet, shopping, and waste habits.
*   **Personalized Dashboard**: Visualizes your footprint using interactive charts (doughnut, bar, and line graphs) and compares your emissions to national and global averages.
*   **Action Plan**: A smart recommendation engine that suggests personalized actions to reduce your footprint, complete with projected CO₂ savings.
*   **Gamified Daily Challenges**: Encourages daily sustainable habits with a streak system, achievements, and unlockable badges.
*   **Education Hub**: Features a responsive fact carousel and deep-dive comparison cards to build climate literacy.
*   **Pledge System**: Allows users to commit to green habits and track their collective impact.

## 🛠️ Technology Stack

*   **HTML5 & CSS3**: Custom responsive styling, CSS variables for theming, dark mode by default, and glassmorphism design.
*   **Vanilla JavaScript (ES6 Modules)**: No frameworks. Modular architecture using ES6 imports.
*   **Local Storage**: Client-side state management ensuring data privacy and persistence without a backend.
*   **Chart.js**: For rendering dynamic and responsive data visualizations on the dashboard.
*   **Lucide Icons**: For clean and consistent iconography.

## 🚀 Getting Started

Since EcoTrack is built entirely with Vanilla web technologies and does not require an NPM build step, getting started is extremely straightforward.

### Prerequisites
You just need a modern web browser and a local development server to handle ES6 module imports.

### Installation & Running Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/KL2300030695/EcoTrack.git
    cd EcoTrack
    ```

2.  **Serve the project locally:**
    Because the application uses ES modules (`<script type="module">`), it must be served over `http://` or `https://`, not directly via the `file://` protocol. 
    
    You can use any local static server. For example, with `npx` and `http-server`:
    ```bash
    npx http-server ./ -p 5500 -c-1 --cors
    ```
    
    Alternatively, you can use the Live Server extension in VS Code.

3.  **Open the application:**
    Navigate to `http://localhost:5500` (or the port provided by your server) in your web browser.

## 🧪 Testing

EcoTrack includes a comprehensive in-browser test suite covering all core modules with **no npm build step required**.

### Test Files

| File | Purpose |
|------|---------|
| `tests/ecotrack.test.js` | Full unit & integration test suite (ES module) |
| `tests/tests.html` | Visual in-browser test runner UI |
| `tests/e2e-selectors.js` | E2E selector contract & `sel()` helper |

### Test Coverage

| Area | What is tested |
|------|---------------|
| **utils.js** | `escapeHTML` (XSS prevention), `safeNumber`, `safeEnum`, `debounce`, `throttle`, `formatNumber`, `formatDate`, `generateUniqueId`, `createSafeElement`, `testId` |
| **storage.js** | Profile save/load & schema validation, monthly history upsert, pledge CRUD & validation, `toggleAction`, streak & challenge logic, achievements, `exportData`/`importData`, `getStorageUsage`, `clearAll` |
| **Calculator Logic** | Emission factors validity, vegan < heavy-meat diet, electric < petrol car, long > short flight, recycleAll < recycleNone, formula sanity check |
| **Actions Data** | Structure integrity, no duplicate IDs, savings accumulation |
| **Categories Data** | 5 correct categories, all required fields, hex colors |
| **e2e-selectors** | Object is frozen, all sections present, no duplicate selector values, `sel()` output format |
| **Security** | XSS payload battery through `escapeHTML`, corrupt localStorage data rejection |

### Running the Tests

The test runner requires ES modules to be served over HTTP (not `file://`).

1. Start a local server from the project root:
   ```bash
   npx http-server ./ -p 5500 -c-1 --cors
   ```

2. Navigate to the test runner in your browser:
   ```
   http://localhost:5500/tests/tests.html
   ```

3. Tests auto-run on page load. Click **▶ Run Tests** to re-run at any time.

The runner displays a live **pass rate**, per-suite collapsible results, and highlights all failing assertions.

---

## 🛡️ Security & Accessibility

EcoTrack has been hardened against the 5 key criteria:

*   **Code Quality**: Strict modular design, JSDoc annotations, deep-frozen data constants, and shared utility functions.
*   **Security**: Robust `Content-Security-Policy`, XSS sanitization via `escapeHTML()` on all dynamic content, and local storage schema validation.
*   **Efficiency**: Event throttling, `IntersectionObserver` cleanup, and efficient DOM manipulations.
*   **Testing**: Widespread use of `data-testid` attributes across all interactive elements for end-to-end testing readiness.
*   **Accessibility (a11y)**: WCAG 2.1 compliant features including a skip-nav link, keyboard navigation support, high-contrast forced-colors mode, `prefers-reduced-motion` integration, and comprehensive ARIA roles, labels, and live announcements.

## 📄 License

This project is open-source and available for educational and personal use.
