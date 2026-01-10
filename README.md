# Dogscatsandchickens v2

A web-based version of the legacy Dog, Cats, and Chickens card game (v1), built with **React**, **TypeScript**, and **Vite**. Supports future expansion for v2 while preserving the original v1 gameplay.

---

## Prerequisites

Before running the project, make sure you have the following installed:

- [Node.js ≥ 20.19](https://nodejs.org/) (or ≥22.12)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Git](https://git-scm.com/)

> ⚠️ Node.js 18.x is **not supported** due to Vite requirements.

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/<your-username>/dogscatsandchickens-v2.git
cd dogscatsandchickens-v2
```

2. Install the dependencies

```bash
npm install
```
This will install all required packages, including React, TypeScript, Vite, and Vitest for testing.

## Running the development server
Start the local development server:
```bash
npm run dev
```
You should see output similar to:
```perl
  Local:   http://localhost:5173/
  Network: use --host to expose
```
Open the URL in your browser to see the app running. Any changes you make to the code will hot-reload automatically.

## Running unit tests
Unit test are implemented using **Vitest**. To run all tests:
```bash
npm run test
```
For continuous test feedback while coding:
```bash
npx vitest --watch
```
Tests cover the model layer:
- CardFactory & card subclasses
- DeckFactory & Deck
- Player
- GameBoard

## Folder Structure (relevant to v1)
```test
src/
 ├─ assets/
 │   ├─ v1/
 │   │   ├─ cards.json
 │   │   ├─ deck.json
 │   │   └─ images/*.jpg
 ├─ model/
 │   ├─ cards/        # Card classes + CardFactory
 │   ├─ deck/         # Deck + DeckFactory
 │   ├─ game/         # GameBoard + Player
 │   └─ types/        # TypeScript type definitions
 └─ tests/            # Unit tests
```

## Notes 
- deck.json defines the composition of the deck (number of copies per card).
- cards.json defines all card types and their properties
- instanceId is automatically generated for each card instance at runtime.
- The model is fully unit-tested and independent of UI code.


# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
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
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
