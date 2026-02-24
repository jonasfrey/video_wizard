# video wizard
this project is a webtool that allows one to edit videos using Artificial Intelligence


## features
word by word cutting. The video is split to parts according to the sounds and language.
after this analysation has been done , the user can freely cut the video by entering a text or choosing sounds.


## plan 
### ERD


## process
extract audio data from video
analyse audio data
store audio data 




# Research
a AI model that can convert speach to text is a so called (STT) model in the industry. 
the AI model whisper from openAI is completly open source and runs completly locally with no internet connection 
`
pip install openai-whisper → local, no internet needed after model download
`


License
GPLv2 Jonas Immanuel Frey

## commands
extract audio
`ffmpeg -i video.mp4 -vn audio.mp3`
extract text
`whisper audio.mp3 --model base`
# credits

## Vendasta
test video CC licencesed 
https://www.youtube.com/watch?v=wazHMMaiDEA


## learnings
### whisper segments 
by default the whisper model grops text to group so called 'segments' and outputs them with timestamps. but the model can also detect each word separately. 
the segments are devided by the following rules: a pause in speech can break a segment. if a segments takes longer than 30 seconds it's split. and if the token buffer limit is overflowing. 


### noises
whisper is speech only. meaningn it cannot detect and label noises like for example: 
- sound effects from video editing (woosh, plop...)
- natural sounds
    - animal sounds
        - bird twitter
        - snake hiss
