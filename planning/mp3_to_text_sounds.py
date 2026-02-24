# pip install tensorflow tensorflow-hub numpy soundfile resampy librosa
import tensorflow_hub as hub
import numpy as np
import librosa
import csv

# Load YAMNet model
model = hub.load("https://tfhub.dev/google/yamnet/1")

# Load class names from the model assets
class_map_path = hub.resolve("https://tfhub.dev/google/yamnet/1") + "/assets/yamnet_class_map.csv"
with open(class_map_path) as f:
    class_names = [row[2] for row in csv.reader(f)][1:]

# Load audio (YAMNet needs 16kHz mono) - librosa handles mp3
audio, sr = librosa.load("audio.mp3", sr=16000, mono=True)

# Run inference
scores, embeddings, spectrogram = model(audio.astype(np.float32))

# YAMNet outputs one frame per ~0.48s
frame_duration = 0.48

# Print top prediction per time frame (skip "Speech" since Whisper handles that)
with open("output_sounds.txt", "w") as f:
    for i, score in enumerate(scores.numpy()):
        top_idx = np.argsort(score)[-3:][::-1]
        timestamp = i * frame_duration
        mins = int(timestamp // 60)
        secs = int(timestamp % 60)

        top_labels = [(class_names[j], score[j]) for j in top_idx]
        labels_str = ", ".join(f"{name} ({conf:.2f})" for name, conf in top_labels)
        f.write(f"[{mins}:{secs:02d}] {labels_str}\n")

print("Saved to output_sounds.txt")
