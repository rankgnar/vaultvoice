#!/usr/bin/env python3
"""Extract speaker embeddings from audio files.

Uses resemblyzer for high-quality speaker embeddings, with a fallback
to librosa MFCC-based embeddings if resemblyzer is unavailable.
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


def extract_resemblyzer(wav_path: str) -> list:
    """Extract embeddings using resemblyzer."""
    from resemblyzer import VoiceEncoder, preprocess_wav

    encoder = VoiceEncoder()
    wav = preprocess_wav(wav_path)
    embedding = encoder.embed_utterance(wav)
    return embedding.tolist()


def extract_mfcc_fallback(wav_path: str) -> list:
    """Extract MFCC-based embeddings using librosa as a fallback."""
    import librosa

    y, sr = librosa.load(wav_path, sr=16000, mono=True)
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=128)
    # Average across time to get a fixed-size embedding
    embedding = np.mean(mfccs, axis=1)
    # Pad or truncate to 256 dimensions
    if len(embedding) < 256:
        embedding = np.pad(embedding, (0, 256 - len(embedding)))
    else:
        embedding = embedding[:256]
    # L2 normalize
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    return embedding.tolist()


def main():
    parser = argparse.ArgumentParser(description='Extract speaker embeddings')
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

    method = "resemblyzer"
    try:
        embedding = extract_resemblyzer(wav_path)
    except Exception:
        method = "mfcc_fallback"
        try:
            embedding = extract_mfcc_fallback(wav_path)
        except Exception as e:
            print(json.dumps({"error": f"Embedding extraction failed: {str(e)}"}))
            sys.exit(1)

    # Clean up temp file
    if wav_path != args.audio:
        try:
            os.unlink(wav_path)
        except OSError:
            pass

    result = {
        "embedding": embedding,
        "dimensions": len(embedding),
        "method": method,
    }

    print(json.dumps(result))


if __name__ == '__main__':
    main()
