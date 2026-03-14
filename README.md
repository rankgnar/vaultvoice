<p align="center">
  <img src="banner.png" alt="VaultVoice Banner" width="100%">
</p>

# VaultVoice

```
╦  ╦╔═╗╦ ╦╦ ╔╦╗╦  ╦╔═╗╦╔═╗╔═╗
╚╗╔╝╠═╣║ ║║  ║ ╚╗╔╝║ ║║║  ║╣
 ╚╝ ╩ ╩╚═╝╩═╝╩  ╚╝ ╚═╝╩╚═╝╚═╝
```

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9%2B-yellow.svg)](https://python.org/)

**Local CLI tool for voice deepfake protection.** Register your voice, then verify suspicious audio against your voiceprint to detect AI-generated clones. Everything runs on your machine — your voice data never leaves your device.

---

## What is VaultVoice?

Voice cloning technology has become alarmingly accessible. A few seconds of audio is enough to create a convincing replica of someone's voice. VaultVoice is a command-line tool that lets you fight back:

1. **Register** your voice by providing audio samples. VaultVoice creates a unique voiceprint — a mathematical fingerprint of your vocal characteristics.
2. **Verify** suspicious audio against your voiceprint. VaultVoice analyzes the audio for both speaker similarity and deepfake indicators, giving you a clear verdict.
3. **Scan** any audio file for deepfake artifacts without needing a registered profile.

All processing happens locally. No cloud APIs, no data collection, no accounts.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- ffmpeg (for non-WAV format support)

### Installation

```bash
# Clone and build
git clone https://github.com/rankgnar/vaultvoice.git
cd vaultvoice
npm install
npm run build

# Install Python dependencies (3 steps for a clean install)

# Step 1: Core libraries
pip3 install librosa numpy scipy soundfile pydub

# Step 2: Speaker encoder (without heavy transitive deps)
pip3 install --no-deps resemblyzer

# Step 3: PyTorch CPU-only (lightweight ~150MB instead of ~3GB)
pip3 install torch --index-url https://download.pytorch.org/whl/cpu
```

> **Note:** On Ubuntu/Debian you may need to add `--break-system-packages` to each `pip3` command, or use a virtual environment:
> ```bash
> python3 -m venv .venv
> source .venv/bin/activate
> pip install librosa numpy scipy soundfile pydub
> pip install --no-deps resemblyzer
> pip install torch --index-url https://download.pytorch.org/whl/cpu
> ```

> **Note:** The `webrtcvad` and `typing` warnings from resemblyzer can be safely ignored — VaultVoice does not require them.

### Usage

```bash
# Register your voice (record 10+ seconds first)
node dist/cli.js register --name "my-voice" --audio my_sample.wav

# Verify suspicious audio
node dist/cli.js verify --profile "my-voice" --audio suspicious_call.wav

# Quick scan without a profile
node dist/cli.js scan --audio unknown_audio.mp3

# List registered profiles
node dist/cli.js list

# Delete a profile
node dist/cli.js delete --name "my-voice"
```

> **Tip:** To record audio on Linux: `arecord -d 10 -f S16_LE -r 16000 my_sample.wav`

### Example Output

```
🔍 Analyzing: suspicious_call.wav

Speaker Match:     92.3% (threshold: 85%)
Deepfake Score:    0.12 (low risk)
Verdict:           ✅ AUTHENTIC — Likely real voice matching profile "my-voice"

Details:
  Duration:        12.4s
  Quality:         Good (SNR: 24dB)
  Spectral:        Natural harmonics detected
  Artifacts:       None found
```

## How It Works

VaultVoice combines two analysis pipelines to produce its verdict:

### Speaker Verification

When you register a voice, VaultVoice extracts a **speaker embedding** — a 256-dimensional vector that captures the unique characteristics of a voice. This uses [resemblyzer](https://github.com/resemble-ai/Resemblyzer), a neural speaker encoder, with a fallback to MFCC-based embeddings if resemblyzer is unavailable.

During verification, VaultVoice extracts the same embedding from the target audio and computes **cosine similarity** against the stored voiceprint. A similarity score above 85% indicates a speaker match.

### Deepfake Detection

VaultVoice uses heuristic spectral analysis to detect synthesis artifacts. The detection pipeline analyzes five signal characteristics:

| Feature | What it detects |
|---------|----------------|
| **Spectral flatness** | Synthetic audio often has unnaturally uniform spectral flatness across frames |
| **Pitch consistency** | Cloned voices may lack natural pitch variation or exhibit abrupt glitches |
| **MFCC patterns** | Higher-order Mel-frequency cepstral coefficients reveal synthesis artifacts |
| **Zero-crossing rate** | Natural speech has characteristic ZCR variation that synthesizers struggle to replicate |
| **Spectral rolloff** | Vocoder-generated audio produces distinctive rolloff patterns |

Each feature produces a suspicion score (0–1), which are combined into a weighted deepfake score. Scores above 0.5 are flagged as suspicious.

### Data Storage

All data is stored locally in `~/.vaultvoice/`:

- `voiceprints.db` — SQLite database containing voice profiles and embeddings
- No temporary files are retained after analysis
- No network requests are made

## Supported Audio Formats

VaultVoice supports the following formats via automatic conversion:

- `.wav` (native)
- `.mp3`
- `.ogg`
- `.flac`
- `.m4a`

Non-WAV formats are converted to 16kHz mono WAV using [pydub](https://github.com/jiaaro/pydub) before analysis. Ensure [ffmpeg](https://ffmpeg.org/) is installed for format conversion.

## VaultVoice vs Enterprise Solutions

| Feature | VaultVoice | Enterprise (Pindrop, Nuance) |
|---------|-----------|------------------------------|
| **Privacy** | Fully local, no data leaves your machine | Cloud-based, data sent to vendor |
| **Cost** | Free, open source | Enterprise licensing ($$$) |
| **Setup** | `npm install && npm run build` | Weeks of integration |
| **Accuracy** | Heuristic-based, good for personal use | ML-based, higher accuracy |
| **Scale** | Individual use | Call center scale |
| **Real-time** | File-based analysis | Real-time call screening |
| **Updates** | Community-driven | Vendor-managed threat intelligence |

VaultVoice is designed for individuals and small teams who need practical deepfake detection without sending their voice data to a third party. For high-stakes enterprise use cases requiring real-time detection and regulatory compliance, consider dedicated enterprise solutions.

## Use Cases

- **Personal security** — Verify that voice messages from family or colleagues are genuine before acting on them
- **Journalism** — Authenticate audio evidence and interview recordings
- **Content creators** — Detect unauthorized voice clones of your content
- **HR & recruitment** — Verify voice identity in remote hiring processes
- **Legal** — Screen audio evidence for manipulation before proceedings
- **Financial services** — Additional verification layer for voice-authorized transactions

## Development

```bash
# Run in development mode
npm run dev -- register --name test --audio sample.wav

# Run tests
npm test

# Build for production
npm run build
```

## Uninstall

```bash
# Remove project
rm -rf vaultvoice

# Remove stored voiceprints
rm -rf ~/.vaultvoice

# Remove Python dependencies
pip3 uninstall resemblyzer librosa numpy scipy soundfile pydub torch -y
```

## License

MIT
