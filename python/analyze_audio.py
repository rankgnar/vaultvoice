#!/usr/bin/env python3
"""Analyze audio file properties: duration, SNR, quality, spectral features."""

import argparse
import json
import sys
import os
import tempfile
import numpy as np


def convert_to_wav(input_path: str) -> str:
    """Convert audio file to WAV format using pydub."""
    ext = os.path.splitext(input_path)[1].lower()
    if ext == '.wav':
        return input_path

    from pydub import AudioSegment

    format_map = {
        '.mp3': 'mp3',
        '.ogg': 'ogg',
        '.flac': 'flac',
        '.m4a': 'mp4',
    }

    fmt = format_map.get(ext)
    if not fmt:
        raise ValueError(f"Unsupported audio format: {ext}")

    audio = AudioSegment.from_file(input_path, format=fmt)
    audio = audio.set_channels(1).set_frame_rate(16000)

    tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    audio.export(tmp.name, format='wav')
    return tmp.name


def estimate_snr(y: np.ndarray) -> float:
    """Estimate Signal-to-Noise Ratio in dB."""
    # Simple SNR estimation: ratio of RMS of signal vs noise floor
    frame_length = 2048
    hop_length = 512

    # Compute RMS energy per frame
    frames = []
    for i in range(0, len(y) - frame_length, hop_length):
        frame = y[i:i + frame_length]
        rms = np.sqrt(np.mean(frame ** 2))
        frames.append(rms)

    if not frames:
        return 0.0

    frames = np.array(frames)
    # Assume bottom 10% of frames represent noise
    sorted_frames = np.sort(frames)
    noise_floor = np.mean(sorted_frames[:max(1, len(sorted_frames) // 10)])
    signal_level = np.mean(sorted_frames[len(sorted_frames) // 2:])

    if noise_floor <= 0:
        return 40.0  # Very clean signal

    snr = 20 * np.log10(signal_level / noise_floor)
    return round(float(np.clip(snr, 0, 60)), 1)


def classify_quality(snr_db: float) -> str:
    """Classify audio quality based on SNR."""
    if snr_db >= 25:
        return "Good"
    elif snr_db >= 15:
        return "Medium"
    elif snr_db >= 8:
        return "Low"
    else:
        return "Poor"


def analyze_spectral_features(y: np.ndarray, sr: int) -> dict:
    """Analyze spectral characteristics of the audio."""
    import librosa

    # Spectral centroid
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    mean_centroid = float(np.mean(centroid))

    # Spectral rolloff
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
    mean_rolloff = float(np.mean(rolloff))

    # Spectral flatness
    flatness = librosa.feature.spectral_flatness(y=y)
    mean_flatness = float(np.mean(flatness))

    # Harmonics detection via harmonic-percussive separation
    y_harmonic, y_percussive = librosa.effects.hpss(y)
    harmonic_ratio = float(np.sum(y_harmonic ** 2) / (np.sum(y ** 2) + 1e-10))

    natural_harmonics = harmonic_ratio > 0.5

    return {
        "centroid_hz": round(mean_centroid, 1),
        "rolloff_hz": round(mean_rolloff, 1),
        "flatness": round(mean_flatness, 4),
        "harmonic_ratio": round(harmonic_ratio, 3),
        "natural_harmonics": natural_harmonics,
    }


def main():
    parser = argparse.ArgumentParser(description='Analyze audio properties')
    parser.add_argument('--audio', required=True, help='Path to audio file')
    parser.add_argument('--output', default='json', help='Output format')
    args = parser.parse_args()

    if not os.path.isfile(args.audio):
        print(json.dumps({"error": f"File not found: {args.audio}"}))
        sys.exit(1)

    try:
        wav_path = convert_to_wav(args.audio)
    except Exception as e:
        print(json.dumps({"error": f"Audio conversion failed: {str(e)}"}))
        sys.exit(1)

    try:
        import librosa

        y, sr = librosa.load(wav_path, sr=16000, mono=True)
        duration = float(librosa.get_duration(y=y, sr=sr))
        snr_db = estimate_snr(y)
        quality = classify_quality(snr_db)
        spectral = analyze_spectral_features(y, sr)

        result = {
            "duration": round(duration, 1),
            "snr_db": snr_db,
            "quality": quality,
            "spectral_features": spectral,
        }
    except Exception as e:
        result = {"error": f"Analysis failed: {str(e)}"}
        if wav_path != args.audio:
            try:
                os.unlink(wav_path)
            except OSError:
                pass
        print(json.dumps(result))
        sys.exit(1)

    # Clean up temp file
    if wav_path != args.audio:
        try:
            os.unlink(wav_path)
        except OSError:
            pass

    print(json.dumps(result))


if __name__ == '__main__':
    main()
