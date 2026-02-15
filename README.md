# Crowd Control

Collaborative control surfaces for live events. Audience members join from their phones and get assigned interactive controls (faders, XY pads, buttons, toggles) that send OSC and MIDI to your setup.

<img width="1007" height="833" alt="image" src="https://github.com/user-attachments/assets/58df2aca-6a3f-43e0-8aef-b098716dfff1" />

```
Phones (web) <--WebSocket--> Relay Server <--WebSocket--> Electron App --OSC/MIDI--> Your Software
```

## Setup

```bash
docker compose run --rm node yarn install
```

## Development

```bash
docker compose up dev    # web + relay on https://localhost:5173
yarn electron            # Electron app (connects to dev server)
```

## Production

```bash
docker compose up prod   # builds and serves on https://localhost:3001
yarn electron:prod       # Electron app (connects to prod server)
```

## Self-hosting

By default the public URL (used for QR codes) points to `localhost`. For phones on the same Wi-Fi to connect, update the **Relay Server URL** in Settings to your machine's network address, e.g. `https://192.168.1.100:3001`.

If the relay server is running on a different machine than the Electron app, override the relay URL:

```bash
RELAY_URL=https://192.168.1.100:3001 yarn electron:prod
```
