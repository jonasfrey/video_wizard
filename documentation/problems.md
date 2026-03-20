# lang detection
it happened that whisper detected the wrong language. and so the video 'CosmosLaundromatBlender.mp4' had many wrong chinese speech events that, even though the video was clearly english.
## solution
a better langauge detector. i think this happened because at the start of the video there was some noise that might have sounded like a chinese utterance. therefore the auto language detection was set to chinese. 

to solve this we should detect languages in small sections of the video. but this is on the side of whisper

