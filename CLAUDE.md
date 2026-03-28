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

## Running

```bash
# Dev (web app + relay on same server, port 5173)
yarn dev

# Production is deployed to Railway (auto-builds from git)

# Electron app (for hosts — local OSC/MIDI bridge)
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
