# EZ Mocker — Agentic Coding Guide

## Project Overview

Vanilla JS Chrome Extension (Manifest V3) that intercepts `fetch` and `XMLHttpRequest` to mock API responses. No build system, no dependencies, no frameworks. Weighs ~100KB.

## Build / Lint / Test Commands

- **No build system** (no package.json, no bundler, no transpiler)
- **No tests** — project is pure JS loaded directly as a Chrome extension
- **No linter/formatter config** — maintain existing style manually
- **Loading the extension:** `chrome://extensions/` → Developer Mode → "Load unpacked" → select repo root
- **Reloading after changes:** Click the refresh icon on the extension card in `chrome://extensions/`
- **Viewing logs:** Right-click extension popup → Inspect popup (popup.js logs); service worker logs under extension details → "Inspect views: background page" (background.js logs); content script logs on the target page's console
- **Verifying content scripts:** Open any webpage's dev console — look for `MAIN:`, `ISOLATED:`, `GENERATOR:` prefixed logs

## Code Style Guidelines

### Imports & Modularity

- No ES modules or imports — all files are standalone scripts loaded via `manifest.json`
- Files reference each other exclusively through `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage` message passing
- Use an IIFE with `'use strict'` at the top of content scripts that run in the MAIN world (`content-script-main.js`)
- Isolated/generator world content scripts and popup/background scripts use plain top-level code

### Formatting

- **Indentation:** 4 spaces (no tabs)
- **Semicolons:** always use semicolons at statement ends
- **Quotes:** double quotes (`"`) consistently for all strings
- **Line length:** soft limit around 100 chars; break long template literals across lines
- **Commas:** trailing commas on multiline object/array literals

### Types & Variables

- **No TypeScript** — plain JS with JSDoc-style comments where helpful
- **Variable declarations:** prefer `const`; use `let` only for reassignment; never use `var`
- **Variable naming:** `camelCase` for all identifiers
- **Constants:** `UPPER_SNAKE_CASE` for true compile-time-known constants (e.g., `popupTimer = 5000`, `httpMethodNames`, `matchTypeNames`, `collectionRequiredFields`)
- **Destructuring:** encouraged for object property access

### Functions & Arrow Functions

- Prefer arrow functions for callbacks, event handlers, and short utility functions
- Use `async` functions with `await` for all `chrome.storage` and `chrome.tabs` operations
- Use regular `function` declarations for constructors (e.g., `function EzXHR()`) and for IIFEs
- Function names in `camelCase`; prefix private helpers with nothing special (no `_` prefix convention)

### Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Variables | `camelCase` | `activeMocks`, `urlPatternInput` |
| Functions | `camelCase` | `loadMocks()`, `saveOrEditMock()` |
| Constants | `UPPER_SNAKE_CASE` | `collectionRequiredFields`, `httpColorList` |
| CSS classes | `kebab-case` | `.header-list-item`, `.mock-info`, `.tab-label` |
| HTML IDs | `kebab-case` | `#url-pattern`, `#http-status-code`, `#save-mock` |
| Chrome message types | `UPPER_SNAKE_CASE` strings | `"UPDATE_RULES"`, `"GET_JSON"`, `"FROM_ISOLATED_TO_MAIN"` |
| Mock model fields | `camelCase` | `urlPattern`, `matchType`, `rawResponse`, `isActive` |

### Error Handling

- Wrap `await` calls in `try/catch` blocks with descriptive `console.error` messages (see `background.js`)
- For JSON parsing, always use `try/catch` and display user-facing errors via the `jsonError` DOM element
- Use `chrome.runtime.lastError` checks in callback-based APIs (e.g., `chrome.action.setIcon`)
- Use `console.log` / `console.error` for debugging; prefix messages with the script context: `"BACKGROUND:"`, `"ISOLATED:"`, `"MAIN:"`, `"GENERATOR:"`
- Return `true` synchronously from `chrome.runtime.onMessage` listeners to keep the messaging channel open for async `sendResponse`

### Chrome Extension Patterns

- **Background service worker (`background.js`):** message broker between popup and content scripts; manages extension icon state
- **Popup (`popup.js`):** wraps everything in `document.addEventListener('DOMContentLoaded', () => { ... })`; manages the mock rules CRUD UI
- **Isolated world content script (`content-script-isolated.js`):** bridge between extension APIs and MAIN world via `window.postMessage`
- **Main world content script (`content-script-main.js`):** IIFE that overrides `window.fetch` and `window.XMLHttpRequest`; uses `findMatchingMock()` for URL pattern matching
- **Generator content script (`content-script-generator.js`):** generates random JSON data on demand
- Always use `chrome.storage.local` for persistence (key: `"mocks"`, key: `"json"`)
- Always call `notifyBackgroundScriptForRules()` after mutating mocks to sync across contexts

### Mock Data Model

```js
{
  id: number,            // Date.now()
  urlPattern: string,    // URL filter string
  matchType: string,     // "contains" | "exact" | "startsWith" | "endsWith" | "regex"
  method: string,        // "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | ...
  delay: number,         // milliseconds (fetch only)
  response: object,      // parsed JSON response body
  rawResponse: string,   // original JSON string before parse
  statusCode: number,    // 100-599
  alias: string | null,  // display name
  isActive: boolean,     // enabled/disabled
  headers: object        // { "Content-Type": "application/json", ... }
}
```

### DOM & UI Patterns

- Query elements at the top of `DOMContentLoaded` via `document.getElementById` and `document.querySelector`
- Use `<template>`-less approach — create DOM elements with `document.createElement` and attach via `appendChild`
- For tab-like navigation, use hidden radio inputs with CSS `:checked` ~ sibling selectors (no JS tab logic)
- Popup notifications built via `renderPopup()` with auto-dismiss timeout
- HTTP method colors stored as a `httpColorList` lookup object

### CSS Conventions

- Plain CSS in `popup.css` (no preprocessor)
- Accent color: `#ff5c35` (orange), hover: `#2ee800` (green)
- Class-based selectors, no CSS modules
- `!important` used sparingly for overrides (e.g., dynamic width on header inputs)
- Transitions: `0.2s ease` for hover effects, `0.4s ease` for slide animations

### What NOT To Do

- Do not add npm/Node dependencies — the extension must remain dependency-free
- Do not convert to TypeScript or introduce a build step
- Do not add testing frameworks
- Do not change `manifest.json` permissions without explicit approval
- Do not remove `return true` from `onMessage` listeners
- Do not use `var` declarations
