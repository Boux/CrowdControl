// Server
export const DEFAULT_RELAY_SERVER = "https://crowdcontrol-production.up.railway.app"

// Network
export const CONTROL_POLL_RATE = 25          // ms between batched control sends (40Hz)
export const HOST_POLL_RATE = 50             // ms between batched host control sends (20Hz)
export const HEARTBEAT_INTERVAL = 2000       // ms between client heartbeats

// Interpolation
export const INTERP_TICK_RATE = 5            // ms between interpolation ticks (200Hz)
export const MAX_INTERP_DURATION = 1000      // ms max interpolation duration
export const DEFAULT_INTERP = CONTROL_POLL_RATE  // ms default interpolation duration

// MIDI
export const MIDI_MAX = 127                  // max MIDI CC value
export const MIDI_CHANNELS = 16
export const MIDI_CC_MAX = 127

// Precision
export const VALUE_DECIMALS = 3              // decimal places for wire values

// Logs
export const MAX_LOG_ENTRIES = 50
