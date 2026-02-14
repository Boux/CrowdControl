# Crowd Control

Collaborative OSC control surfaces for live events.

## Architecture

```
Phones (web) <--WebSocket--> Relay Server <--WebSocket--> Electron App --OSC--> TouchOSC
```

## Project Structure

```
CrowdControl/
├── server/           # Production server (web + relay)
│   ├── index.js      # Entry point (serves dist/ + socket.io)
│   └── relay.js      # Socket.io relay logic (shared with Vite plugin)
├── electron/         # Electron main process
│   ├── main.js
│   ├── preload.js
│   ├── relay.js      # Socket.io client
│   └── osc.js        # OSC client (UDP/TCP)
├── src/              # Vue app (web + electron renderer)
│   ├── views/
│   │   ├── web/      # Participant views
│   │   └── electron/ # Host views
│   ├── stores/
│   ├── components/
│   └── router/
└── package.json
```

## Docker

All node/yarn/npm commands must be run through Docker:

```bash
docker compose run --rm node yarn <command>
```

Examples:
```bash
docker compose run --rm node yarn install
docker compose run --rm node yarn build
docker compose run --rm node yarn add <package>
```

Never run node, yarn, or npm directly on the host.

## Running

```bash
# Dev (web app + relay on same server, port 5173)
docker compose run --rm node yarn dev

# Production (build then serve on port 3001)
docker compose run --rm node yarn build
docker compose run --rm node yarn serve

# Electron app (for hosts — requires host display, not dockerized)
yarn electron
```

## Coding Conventions

### Indentation & Nesting
- Max 1-2 levels of indentation
- Use early returns for validation
- Avoid nested conditionals

### Error Handling
- Use `.catch(err => ...)` for single-line handling
- Avoid try-catch unless necessary

### Strings
- JavaScript: double quotes `"hello"`
- Vue templates: single quotes `<div class='foo'>`

### Vue Components
- Order: `<script>` -> `<template>` -> `<style>`
- Options API, plain JavaScript
- SASS for styles (indented syntax)

### General
- Keep code simple and maintainable
- Prefer flat over nested
- No unnecessary abstractions
