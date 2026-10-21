// Generated from tokens.json by build.mjs — do not edit.
// Durations are in seconds (ready for @snowbros/motion); dimensions in px; easings as [x1, y1, x2, y2].
export const tokens = {
  "motion": {
    "duration": {
      "instant": 0.07,
      "quick": 0.11,
      "base": 0.15,
      "moderate": 0.24,
      "slow": 0.4,
      "deliberate": 0.7,
      "cinematic": 1
    },
    "easing": {
      "functional-standard": [
        0.2,
        0,
        0.38,
        0.9
      ],
      "functional-enter": [
        0,
        0,
        0.38,
        0.9
      ],
      "functional-exit": [
        0.2,
        0,
        1,
        0.9
      ],
      "expressive-standard": [
        0.4,
        0.14,
        0.3,
        1
      ],
      "expressive-enter": [
        0,
        0,
        0.3,
        1
      ],
      "expressive-exit": [
        0.4,
        0.14,
        1,
        1
      ],
      "emphasized": [
        0.2,
        0,
        0,
        1
      ],
      "emphasized-decelerate": [
        0.05,
        0.7,
        0.1,
        1
      ],
      "emphasized-accelerate": [
        0.3,
        0,
        0.8,
        0.15
      ],
      "editorial": [
        0.16,
        1,
        0.3,
        1
      ],
      "cinematic": [
        0.65,
        0,
        0.35,
        1
      ]
    },
    "stagger": {
      "tight": 0.02,
      "base": 0.05,
      "loose": 0.09
    }
  },
  "color": {
    "ink": "#0b0c0e",
    "graphite": "#1d1f23",
    "slate": "#3a3d44",
    "mist": "#8a8f98",
    "frost": "#d9dee5",
    "snow": "#f3f2ee",
    "paper": "#fbfaf7",
    "glacier": "#7fa7d9",
    "signal": "#ff4f1f",
    "positive": "#1f8a5b",
    "caution": "#b7791f",
    "critical": "#d23b2f"
  },
  "font": {
    "family": {
      "display": [
        "Instrument Serif",
        "Iowan Old Style",
        "Georgia",
        "serif"
      ],
      "sans": [
        "Inter Tight",
        "Inter",
        "system-ui",
        "sans-serif"
      ],
      "mono": [
        "JetBrains Mono",
        "ui-monospace",
        "SFMono-Regular",
        "monospace"
      ]
    }
  },
  "space": {
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 24,
    "6": 32,
    "7": 48,
    "8": 64,
    "9": 96,
    "10": 144
  },
  "radius": {
    "sm": 4,
    "md": 8,
    "lg": 14,
    "pill": 999
  }
} as const;

export type Tokens = typeof tokens;
