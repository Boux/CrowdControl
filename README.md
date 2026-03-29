# Crowd Control

Collaborative control surfaces for live events. Audience members join from their phones and get assigned interactive controls (faders, XY pads, buttons, toggles) that send OSC and MIDI to your software.

<img width="1015" height="825" alt="image" src="https://github.com/user-attachments/assets/cd6e0fec-5383-46b3-8a7f-4c0ffbf0998d" />

## How it works

1. Open the **Crowd Control** desktop app and create a session
2. Design your control surfaces — add faders, XY pads, buttons, and toggles
3. Click **Go Live** to start the session on the server
4. Participants scan the QR code with their phone to join
5. Each participant gets a seat with controls that send OSC and MIDI to your setup in real time

## Getting started

### Download

Download the latest release from the [Releases](../../releases) page.

### From source

Requires [Node.js](https://nodejs.org/) 22+ and [Yarn](https://yarnpkg.com/).

```bash
yarn install
yarn electron
```

## Controls

| Control | Description |
|---------|-------------|
| **Fader** | Vertical or horizontal slider. Sends a continuous value. |
| **XY Pad** | Two-axis touch pad. Sends X and Y values. |
| **Button** | Momentary — sends a value on press, another on release. |
| **Toggle** | Latching — alternates between on and off values on each tap. |

Each control can be mapped to an OSC address and/or a MIDI CC.

## Settings

- **Relay Server** — the server that connects phones to your app. A default server is provided, or you can add your own.
- **OSC Output** — enable/disable, set the host, port, and protocol (UDP/TCP) for your OSC receiver.
- **MIDI Output** — enable/disable, select a MIDI device on your system.
