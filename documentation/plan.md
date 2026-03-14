# video_wizard
this is collecting ideas of how to make this project work. 

i want to be able to load a certain file. this gets then converted to a master audio file. this audio gets analized and converted to text events. either spoken words or things like noises or music. finally i want a video editor where i can manipulate a video by simply selecting text events  and then the video gets cut according to the words that i selected. instead of selecting words i can also image it would be nice to be able to write text or select sentance parts. finally i can render the result to a new video. 

i want a single page application. this current workspace already provides a good teamplate for most technical functionalities required.

something i want to make sure is that i can monitor all cli processes from the gui in a nice way so that i do not have to observe a spinning 'loading' not knownig what happens exactly.

as stated in the readme , this project is not considered to be hosted on a webserver and we do not have to care about security. 

ideas:
    all analized videos could be filtered , since we have text data. 



my current data structure looks like
---
o_fsnode 
- s_path_abs

(simply a object for a file or folder , one-to-one with o_video)

o_video ()
- n_ms_duration
(if the o_fsnode is a legit video this is the object for it - one-to-one with o_fsnode)

o_audio
- n_ms_duration
(i know a video could have multiple audio channels but those should be merged into one audio file one-to-one with o_video)

o_audio_event
- n_ms_start
- n_ms_duration
- s_type (speech, Music, utterance)
- s_text ('you')

(the valuable text data , using BEATs and whisper to convert audio to text )
(many-to-one with o_audio)

o_composition
s_name
consists of one or multiple o_audio_event, can be rendered to a video
(many-to-many with o_audio_event)
(one-to-one with o video)


--- 
process

single page application pages:
'filebrowser'
user selects a video (o_fsnode) in file browser
user clicks 'analyze'
file is converted to one audio, audio is analized
all o_fsnode that are picked show next to the file browser with the status wether they are fully analized or not . their s_path_abs is clickable and on click the file browser jumps to this folder. 

'composition'
handles the creation and edit of a composition.
a o_fsnode can be selected, a title can be entered.
the view has 2 sections. a top section and a timeline. the top section is the video preview. the timeline below acts as the 'editor', audio events can be added or removed  and reordered. the preview video can be played according to the selected audio events. 

'export' 
lists all compositions and lets the user export them  

---
make a step by step plan to implement this software. 