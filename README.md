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
* Help commands
* Modular commands
* Alias detection
* Global server/user bans
* Global server/user unbans
* Cooldown per cmd

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
* RGB / HEX / HSV / HSL / HSB / CMYK colour conversion (and preview)
* Measurement conversion (cm, pt, pc, mm, in etc.)
* Colour contrast validator / checker
* Units converter

### Feature hooking in progress

## Features to hook in to bot:
* Custom image uploader, with CDN. (Must be paid feature 'cuz this shit costs)
* Stock images (via Unsplash.com)
* Stock textures (via Pexels.com)
* Find font / typeface lookup (via MyFonts.com) Kinda finished. API is bugged.

## Planned features:
* QR code generator

#### Permission levels:
0. Global ban. The server or user is banned from using the command on a global level.
1. Local ban. The user is banned from using the command on this server.
2. Default. The normal permission level everyone starts with. Permission to most normal commands.
3. Moderator. A user that can ban users from using the bot.
4. Administrator. This user can enable/disable modules and change prefix, in addition to everything a Moderator can.
5. Bot dev. The user is one of the devs. Higher permission to dev-level stuff.
6. Bot owner. Me.