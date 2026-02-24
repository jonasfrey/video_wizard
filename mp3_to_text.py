# python3 -m venv ~/venv
# source ~/venv/bin/activate
# pip install openai-whisper
import whisper

model = whisper.load_model("base")
result = model.transcribe("audio.mp3", word_timestamps=True)

with open("output.txt", "w") as f:
    for segment in result["segments"]:
        # Timestamp for the segment
        mins = int(segment["start"] // 60)
        secs = int(segment["start"] % 60)
        f.write(f"\n[{mins}:{secs:02d}] ")

        # Words with individual timestamps
        for word in segment["words"]:
            f.write(word["word"])

        f.write("\n")

        # Word-level detail
        for word in segment["words"]:
            start = word["start"]
            end = word["end"]
            text = word["word"].strip()
            f.write(f"  [{start:.2f} - {end:.2f}] {text}\n")

print("Saved to output.txt")