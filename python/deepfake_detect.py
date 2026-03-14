#!/usr/bin/env python3
"""Heuristic deepfake detection using spectral analysis.

Detection approach:
1. Spectral flatness analysis (synthetic audio has unnatural patterns)
2. Pitch consistency (cloned voices have less natural variation)
3. MFCC analysis (Mel-frequency cepstral coefficients)
4. Zero-crossing rate patterns
5. Spectral rolloff consistency
"""

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


def analyze_spectral_flatness(y: np.ndarray, sr: int) -> float:
    """Analyze spectral flatness consistency.

    Synthetic audio tends to have more uniform spectral flatness
    across frames compared to natural speech.
    Returns a score 0-1 where higher = more suspicious.
    """
    import librosa

    flatness = librosa.feature.spectral_flatness(y=y)
    if flatness.size == 0:
        return 0.0

    # Natural speech has high variance in spectral flatness
    flatness_std = float(np.std(flatness))
    flatness_mean = float(np.mean(flatness))

    # Low variance in flatness is suspicious (too uniform)
    # Natural speech: std typically > 0.05
    if flatness_std < 0.02:
        return 0.8
    elif flatness_std < 0.04:
        return 0.4
    else:
        return 0.1


def analyze_pitch_consistency(y: np.ndarray, sr: int) -> float:
    """Analyze pitch variation patterns.

    Natural voices have smooth pitch transitions.
    Cloned voices may have abrupt pitch changes or unnaturally steady pitch.
    Returns a score 0-1 where higher = more suspicious.
    """
    import librosa

    # Extract fundamental frequency
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y, fmin=50, fmax=500, sr=sr
    )

    if f0 is None:
        return 0.0

    # Filter out unvoiced segments
    voiced_f0 = f0[~np.isnan(f0)]

    if len(voiced_f0) < 10:
        return 0.3  # Too short to analyze

    # Check pitch variation
    f0_std = float(np.std(voiced_f0))
    f0_mean = float(np.mean(voiced_f0))

    if f0_mean == 0:
        return 0.5

    coefficient_of_variation = f0_std / f0_mean

    # Natural speech has moderate pitch variation (CV ~ 0.1-0.3)
    # Too low = robotic, too high = glitchy
    if coefficient_of_variation < 0.03:
        return 0.7  # Unnaturally steady
    elif coefficient_of_variation > 0.5:
        return 0.6  # Unnaturally variable (glitchy)
    else:
        return 0.1  # Natural range


def analyze_mfcc_patterns(y: np.ndarray, sr: int) -> float:
    """Analyze MFCC patterns for synthesis artifacts.

    Synthetic audio often shows unnatural patterns in higher-order MFCCs.
    Returns a score 0-1 where higher = more suspicious.
    """
    import librosa

    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)

    # Higher-order MFCCs (13-20) in natural speech have specific distributions
    higher_mfccs = mfccs[12:, :]
    higher_std = float(np.mean(np.std(higher_mfccs, axis=1)))

    # Very low variation in higher MFCCs is suspicious
    if higher_std < 0.5:
        return 0.7
    elif higher_std < 1.0:
        return 0.3
    else:
        return 0.1


def analyze_zcr_patterns(y: np.ndarray) -> float:
    """Analyze zero-crossing rate patterns.

    Natural speech has characteristic ZCR patterns that differ from
    synthesized audio.
    Returns a score 0-1 where higher = more suspicious.
    """
    import librosa

    zcr = librosa.feature.zero_crossing_rate(y)

    if zcr.size == 0:
        return 0.0

    zcr_std = float(np.std(zcr))
    zcr_mean = float(np.mean(zcr))

    # Very uniform ZCR is suspicious
    if zcr_mean > 0 and zcr_std / zcr_mean < 0.2:
        return 0.5
    else:
        return 0.1


def analyze_spectral_rolloff(y: np.ndarray, sr: int) -> float:
    """Analyze spectral rolloff consistency.

    Vocoder-generated audio often has characteristic rolloff patterns.
    Returns a score 0-1 where higher = more suspicious.
    """
    import librosa

    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)

    if rolloff.size == 0:
        return 0.0

    rolloff_std = float(np.std(rolloff))
    rolloff_mean = float(np.mean(rolloff))

    # Check for unnaturally consistent rolloff
    if rolloff_mean > 0 and rolloff_std / rolloff_mean < 0.05:
        return 0.6
    else:
        return 0.1


def detect_artifacts(y: np.ndarray, sr: int) -> dict:
    """Detect specific synthesis artifacts."""
    import librosa

    artifacts = []
    artifact_details = {}

    # Check for vocoder fingerprint (periodic patterns in spectrogram)
    S = np.abs(librosa.stft(y))
    # Look for unnaturally periodic patterns
    spec_autocorr = np.mean([
        np.correlate(S[i], S[i], mode='same').max()
        for i in range(min(50, S.shape[0]))
    ]) if S.shape[0] > 0 else 0

    # Check for frequency gaps (common in low-quality synthesis)
    freq_energy = np.mean(S, axis=1)
    if len(freq_energy) > 10:
        freq_diffs = np.diff(freq_energy)
        sharp_drops = np.sum(np.abs(freq_diffs) > np.std(freq_diffs) * 3)
        if sharp_drops > len(freq_diffs) * 0.1:
            artifacts.append("Synthesis artifacts detected (vocoder fingerprint)")
            # Find the frequency range of artifacts
            artifact_bins = np.where(np.abs(freq_diffs) > np.std(freq_diffs) * 3)[0]
            if len(artifact_bins) > 0:
                freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
                if len(freqs) > artifact_bins[-1]:
                    low_freq = freqs[artifact_bins[0]] / 1000
                    high_freq = freqs[min(artifact_bins[-1] + 1, len(freqs) - 1)] / 1000
                    artifact_details["frequency_range"] = f"{low_freq:.1f}kHz-{high_freq:.1f}kHz"

    if not artifacts:
        artifacts.append("None found")

    return {
        "artifacts": artifacts,
        "details": artifact_details,
    }


def main():
    parser = argparse.ArgumentParser(description='Detect deepfake audio')
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

        # Run all heuristic analyses
        scores = {
            "spectral_flatness": analyze_spectral_flatness(y, sr),
            "pitch_consistency": analyze_pitch_consistency(y, sr),
            "mfcc_patterns": analyze_mfcc_patterns(y, sr),
            "zcr_patterns": analyze_zcr_patterns(y),
            "spectral_rolloff": analyze_spectral_rolloff(y, sr),
        }

        # Weighted average for final deepfake score
        weights = {
            "spectral_flatness": 0.25,
            "pitch_consistency": 0.25,
            "mfcc_patterns": 0.20,
            "zcr_patterns": 0.15,
            "spectral_rolloff": 0.15,
        }

        deepfake_score = sum(
            scores[k] * weights[k] for k in scores
        )
        deepfake_score = round(float(np.clip(deepfake_score, 0, 1)), 2)

        # Detect artifacts
        artifact_result = detect_artifacts(y, sr)

        # Determine confidence
        score_variance = float(np.std(list(scores.values())))
        if score_variance < 0.1:
            confidence = "HIGH"
        elif score_variance < 0.2:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        # Spectral description
        if deepfake_score > 0.5:
            spectral_desc = f"Unnatural frequency patterns"
            if "frequency_range" in artifact_result.get("details", {}):
                spectral_desc += f" at {artifact_result['details']['frequency_range']}"
        else:
            spectral_desc = "Natural harmonics detected"

        result = {
            "deepfake_score": deepfake_score,
            "artifacts": artifact_result["artifacts"],
            "confidence": confidence,
            "spectral_description": spectral_desc,
            "component_scores": scores,
        }
    except Exception as e:
        result = {"error": f"Detection failed: {str(e)}"}
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
