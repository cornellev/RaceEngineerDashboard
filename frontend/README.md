# Frontend Design and Build

## Getting Started

This project uses **Bun** as a package manager and runtime.
Run the following command in the frontend directory to start a dev environment.

```
bun run dev
```

This should start a dev environment at `port 5173` on your machine.

Make sure to specify a `VITE_GOOGLE_MAPS_API_KEY` and a
`VITE_GOOGLE_MAP_ID` in a newly created `.env` file. Follow the
format in the `.env.example` for the frontend. It's also listed here for reference.

```env
VITE_GOOGLE_MAPS_API_KEY=Your_Google_Maps_API_Key
VITE_GOOGLE_MAP_ID=Your_Google_Map_ID
```

To get your own **Google Maps API** keys and map ID,  
Head to the [Google Cloud Console](https://console.cloud.google.com/google/maps-hosted/overview),
create a new project, and go to `Keys and Credentials` to get your Google Maps `API_KEY`or
generate your own. Then, navigate to the `Map Management` tab, and create a new map to generate your own `MAP_ID`.  
Refer to the [Google Maps API](https://developers.google.com/maps/documentation/javascript/get-api-key) getting
started guide for more information.

As a note, the top level `docker compose up` works fine without
the frontend `.env` file, just follow the instructions in the top
level `README`. This frontend instruction is just for development
of the frontend UI in isolation from the backend.

## Design

### React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

**TailwindCSS + MUICharts + DaisyUI**  
This project utilizes these libraries for reusable components and style classes in React.
These are especially important for the Line Charts, buttons, menus and dashboard tile components.

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
