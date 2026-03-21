

# Reflexion
das arbeiten mit KI ist durchaus praktisch und ich komme extrem viel schneller voran. dennoch gibt es einige hürden. so zum beispiel ist es schwierig richtig zu prompten. oft programmiert die KI nicht genau so wie man das gärne hätte oder sie lässt sogar sachen komplet weg die man implementiert haben möchte. das richtige prompten muss gelernt sein. allerdings ist es schwierig da man mit claude code nicht genau sieht was alles abgeht im hintergrund bzw was genau mit den prompts geschieht und ob und wie diese eingesetzt und oder verändert werden. 

technisch hatte ich eine kleine unschönheit dass die sprache in einem video als chinesisch erkannt wurde, was dann die software unbrauchbar machte für dieses video. 

das projekt hat dennoch viel freude bereitet und es ist immer wieder spannend zu sehen wie mächtig kontext bewusste KI tools sind. 
## resultat nicht wie erwartet
das video schneiden mit den analisierten wörtern funktioniert doch nicht so wie ich es erwartet habe. und zwar ist die "auflösung" der analyse zu gering. was ich damit meine: wenn nun in einem audio ein satz gesprochen wird zb :"I was there" und man möchte das wort: "was" verwenden um einen neuen satz mit anderen wörtern zu bilden, dann kann es gut sein das das wort so schnell und speziell im satz eingebettet ausgesprochen wird dass es sich kaum eignet um als eigenständiges wort in einem neuen satz zu verwenden. dies hat zur folge dass die resultierenden zusammengesetzten neuen sätze kaum oder gar nicht verständlich sind. Dies zeigt klar , wie audio daten viel komplizierter sind als ich zuerst angenommen habe und audio ist nicht 1:1 vergleichbar mit text daten. wir menschen reden halt nicht wie monotone roboter.
eine lösung für das problem könnte eine art qualitäts filter sein welcher zeigt wie qualitativ und "alleinstehend" eine  utterance ausgesprochen wird. 

# aussicht
die applikation kann natürlich zu einem kompletten video editor erweitert werden, keine frage. ich werde dieses vorhaben eventuel einmal aufnehmen, aber im moment bin ich mit anderen projekten mehr beschäftigt. technisch könnte man sich überlegen ffmpeg mit WASM im browser laufen zu lassen. https://github.com/ffmpegwasm/ffmpeg.wasm. 
natürlich könnte die optische analyse von bilder auch noch mit einbezogen werden um noch mehr nützliche kontext informationen für den video editor zu erhalten. 





