["Spotify tracker bot logo"](https://cdn.discordapp.com/icons/653289817081118724/5669a159eaa69db3cc273025e290b6dc.png)]

# DEPRECATED
The bot will not be developed further as Discord have made significant changes to how commands will be working henceforth. Furthermore the API endpoint this bot uses, and relies on, has been changed to a different version. To use this endpoitn requires migration of the underlying Discord.JS library.

The repository remains publicly visible for anyone who wants to look at it.

# Spotify tracker
**Disclaimer** — This is **not** a bot that does *any* kind of playing or listening of music. The only thing it does is reading your Rich Presence for Spotify plays. It does **not** track you unless you explicitly tell it to first.  

*For old v1 docs, see [`v1_docs.md`](v1_docs.md).*

---

## Background
The bot was made because Spotify's recently played was absolutely horrible, and at one point I *really* wanted to find back to a song I listened to. I assumed it'd end up in Recently played, but *nooooo*.  

This is the v2 of the bot, based on a complete re-write. What about the old version? Well we sent that one to the shadow realm.

## Commands
**Prefix: `!!`** — custom prefix per guild is supported, but command not yet made.  
* `enable` — Start tracking your Spotify plays.  
* `disable` — Pause tracking.  
* `now` — Show which song you are currently playing, or last played if not playing.  
* `now <username|metion|uid>` — Show which song a user in the current guild is listening to, or the last song they played.  
* `invite` — Shows Bot invite information and link.  
* `top`
    * `tracks` — Shows top 10 played tracks in the guild. Only entries by current members are counted.  
    * `listeners`— Shows top 10 users that have listened to the most music in this guild. Only entries by current members are counted. 
    * `<username|mention|uid>` — Show a specific users top 10 most played songs. Can only show on members in current guild.
* `info` — Shows basic information on the bot.
* `reload <module name>` — Hot-reload a command module, and the associated files it uses—as long as they are located within the commands folder.
* `permissions` — Raw output of your Bot permissions.
* `random` — Get a random song a user in the current guild has listened to.
* `random <username|mention|uid>` — Get a random song a specific user in the current guild has listened to.

## Inspiration
While the Bot was first and foremost inspired by Spotify's lacks, it was also inspired by a different open source bot called [Basset](https://github.com/Aux/Basset) for some of the commands. This bot seems to have had some of the same use as this bot, but was written in a language I am not able to work on top of.

## Roadmap
* Search for tracks, albums, artists, playlists, and genere on Spotify
* Get recommendation based on your or ausers taste
* Get recommendation based on track, album, artist, or genere
* Dig up information on artist or album
* Command to add the song you or a user is currently playing to some sort of public favourites list, or something
* Search your own or a users plays history
* Play feed: bot posts which songs users are currently listening to—right after we figure out how to not spam the API, even with Webhooks for 10 embeds at a time.
