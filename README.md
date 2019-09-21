![Grafik temporary logo](https://i.thevirt.us/05/Grafik-temp-logo-medium.png)

# Grafik — Bot.
Discord bot made for graphic designers and artists, with various utilities and help.

### There's four separate components:
1. Frontend — Serving the users with a website.
2. Bot — The Discord bot itself  *(this repository)*.
3. Backend — An API that both frontend and bot hooks in to.
4. Database — ~~A painting of an old man in a park~~ where all the stored data is? Accessed only by backend

## Core bot features completed
* Hot-reload commands
* Help commands - based on your own permission
* Modular commands
* Alias detection
* Global server/user bans
* Global server/user unbans
* Cooldown per cmd
* Disabled channels
* Bypassed disabled command usage in channels
* Disabled commands
* Statistics
* Auto guild create DB entries: settings and statistics
* Permissions system

### Core bot feature hooking in progress
* None.

## Bot required pre-requisites
* Permissions system
* Custom prefix per-channel
* Check server permission required
* Permissions command(s) to change above.
* Setup the server feature (guided setup) to set all of the above initially.

## Features hooked in to bot so far
* Watermark
* PPI calculation
* RGB / HEX / HSV / HSL / HSB / CMYK /etc. colour conversion (and preview)
* Measurement conversion (cm, pt, pc, mm, in etc.)
* Colour contrast validator / checker
* Units converter
* Icon finder
* Stock images (via Unsplash) (Require API approval)
* Stock textures (via Pexels.com)
* Bug report
* Feature suggestion
* Help command
* LMGTFY
* Invite
* Ping
* Guild settings
* Vote for bot
* Form builder/user \[Premium\]
* Dummy text generator

### Feature hooking in progress

## Features to hook in to bot:
* Custom image uploader, with CDN. (Must be paid feature 'cuz this shit costs)
* Stock images (via Unsplash.com)
* Find font / typeface lookup (via MyFonts.com) Kinda finished. API is bugged.

## Planned features:
* QR code generator

#### Permission levels:
0. Inherit
2. Global ban. The server or user is banned from using the command on a global level.
4. Local ban. The user is banned from using the command on this server.
8. Default. The normal permission level everyone starts with. Permission to most normal commands.
16. Premium. User has purchased premium bot.
32. Community. People that have access to community commands. Basically helpers.
64. Moderator. A user that can ban users from using the bot.
128. Administrator. This user can enable/disable modules and change prefix, in addition to everything a Moderator can.
256. Bot dev. The user is one of the devs. Higher permission to dev-level stuff.
512. Bot owner. Me.