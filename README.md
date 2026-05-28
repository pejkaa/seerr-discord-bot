# Seerr Discord Bot

A Discord bot that lets users request movies and TV shows via slash commands, routed through your Seerr (Jellyseerr or Overseerr) instance. Supports multiple configurable libraries, Discord-to-Seerr user account linking, and availability notifications.

## Features

- 🎬 `/request-movies` — search and request movies
- 📺 `/request-tv-shows` — search and request TV shows
- 👨‍👩‍👧 Optional extra libraries (Kids Movies, Kids TV Shows, etc)
- 🔗 Link Discord accounts to Seerr user profiles
- 📥 Posts new requests to a dedicated Discord channel
- 🔔 Pings users in a notification channel when their media is available
- 📺 Season picker for TV show requests
- 🔄 Syncs request statuses from Seerr every 5 minutes

## Commands

| Command | Description |
|---------|-------------|
| `/request-movies` | Search and request a movie |
| `/request-tv-shows` | Search and request a TV show |
| `/request-kids-movies` | Request a kids movie (if configured) |
| `/request-kids-tv-shows` | Request a kids TV show (if configured) |
| `/link <email>` | Link your Discord account to your Seerr account |
| `/unlink` | Unlink your Discord account |
| `/whois [@user]` | Check which Seerr account a Discord user is linked to |
| `/linklist` | List all linked Discord <-> Seerr accounts (admin only) |
| `/seer-status` | Check bot and Seerr connection status |

> Command names are dynamic based on your library configuration. If you name Library 1 "Movies", the command becomes `/request-movies`.

---

## Prerequisites

- A running **Seerr** instance (Jellyseerr or Overseerr)
- A **Discord application and bot** (free) at https://discord.com/developers/applications
- **Docker** (Unraid, Portainer, or any Docker host)

---

## Discord Bot Setup

### 1. Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Click **New Application** and give it a name
3. Go to **Bot** → click **Add Bot**
4. Under **Token** click **Reset Token** and copy it — this is your `DISCORD_TOKEN`
5. Enable **Server Members Intent** under Privileged Gateway Intents

### 2. Get your Client ID

Go to **General Information** → copy the **Application ID** — this is your `DISCORD_CLIENT_ID`

### 3. Invite the Bot to your Server

Go to **OAuth2 → URL Generator** and select:
- Scopes: `bot` + `applications.commands`
- Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`

Copy the generated URL and open it in your browser to invite the bot.

### 4. Get your Server and Channel IDs

Enable Developer Mode in Discord: **Settings → Advanced → Developer Mode**

- **Server ID** (`DISCORD_GUILD_ID`): Right-click your server name → Copy Server ID
- **Requests Channel ID** (`REQUESTS_CHANNEL_ID`): Right-click your requests channel → Copy Channel ID
- **Notify Channel ID** (`NOTIFY_CHANNEL_ID`): Right-click your notifications channel → Copy Channel ID

---

## Seerr Setup

### Get your API Key

Go to **Seerr → Settings → General** and copy the **API Key**

### Find your Server IDs

To route requests to different libraries (e.g. Movies vs Kids Movies), you need the server IDs configured in Seerr:

```bash
# Replace with your Seerr URL and API key
curl -s -H "X-Api-Key: YOUR_API_KEY" http://YOUR_SEERR_URL/api/v1/settings/radarr
curl -s -H "X-Api-Key: YOUR_API_KEY" http://YOUR_SEERR_URL/api/v1/settings/sonarr
```

Look for the `"id"` field in each entry — the first server is `0`, second is `1`, etc.

---

## Installation

### Option A — Unraid (recommended)

**1. Add the template:**
```bash
wget -O /boot/config/plugins/dockerMan/templates-user/SeerrDiscordBot.xml \
  https://raw.githubusercontent.com/pejkaa/unraid-templates/main/SeerrDiscordBot.xml
```

**2.** Go to **Docker → Add Container** → select **SeerrDiscordBot** from User Templates

**3.** Fill in all the required fields and click **Apply**

**4.** Register slash commands:
```bash
docker exec SeerrDiscordBot node src/register.js
```

---

### Option B — Docker CLI

```bash
docker run -d \
  --name SeerrDiscordBot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=your_token \
  -e DISCORD_CLIENT_ID=your_client_id \
  -e DISCORD_GUILD_ID=your_guild_id \
  -e REQUESTS_CHANNEL_ID=your_channel_id \
  -e NOTIFY_CHANNEL_ID=your_notify_channel_id \
  -e SEER_URL=http://192.168.1.100:5055 \
  -e SEER_API_KEY=your_api_key \
  -e LIBRARY_1_NAME=Movies \
  -e LIBRARY_1_TYPE=movie \
  -e LIBRARY_1_SERVER_ID=0 \
  -e LIBRARY_2_NAME="TV Shows" \
  -e LIBRARY_2_TYPE=tv \
  -e LIBRARY_2_SERVER_ID=0 \
  -v /mnt/user/appdata/SeerrDiscordBot/data:/app/data \
  pejkaa/seerr-discord-bot:latest
```

Then register commands:
```bash
docker exec SeerrDiscordBot node src/register.js
```

---

### Option C — Docker Compose / Portainer Stack

```yaml
version: "3.8"
services:
  seerr-discord-bot:
    image: pejkaa/seerr-discord-bot:latest
    container_name: SeerrDiscordBot
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=your_token
      - DISCORD_CLIENT_ID=your_client_id
      - DISCORD_GUILD_ID=your_guild_id
      - REQUESTS_CHANNEL_ID=your_channel_id
      - NOTIFY_CHANNEL_ID=your_notify_channel_id
      - SEER_URL=http://192.168.1.100:5055
      - SEER_API_KEY=your_api_key
      - LIBRARY_1_NAME=Movies
      - LIBRARY_1_TYPE=movie
      - LIBRARY_1_SERVER_ID=0
      - LIBRARY_2_NAME=TV Shows
      - LIBRARY_2_TYPE=tv
      - LIBRARY_2_SERVER_ID=0
      # Optional extra libraries:
      # - LIBRARY_3_NAME=Kids Movies
      # - LIBRARY_3_TYPE=movie
      # - LIBRARY_3_SERVER_ID=1
      # - LIBRARY_4_NAME=Kids TV Shows
      # - LIBRARY_4_TYPE=tv
      # - LIBRARY_4_SERVER_ID=1
    volumes:
      - /mnt/user/appdata/SeerrDiscordBot/data:/app/data
```

Then register commands:
```bash
docker exec SeerrDiscordBot node src/register.js
```

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your Discord bot token |
| `DISCORD_CLIENT_ID` | Your Discord application/client ID |
| `DISCORD_GUILD_ID` | Your Discord server ID |
| `REQUESTS_CHANNEL_ID` | Channel ID where requests are posted |
| `SEER_URL` | URL of your Seerr instance |
| `SEER_API_KEY` | Your Seerr API key |
| `LIBRARY_1_NAME` | Name of first library (e.g. `Movies`) |
| `LIBRARY_1_TYPE` | Type of first library: `movie` or `tv` |
| `LIBRARY_1_SERVER_ID` | Seerr server ID for first library |
| `LIBRARY_2_NAME` | Name of second library (e.g. `TV Shows`) |
| `LIBRARY_2_TYPE` | Type of second library: `movie` or `tv` |
| `LIBRARY_2_SERVER_ID` | Seerr server ID for second library |

### Optional

| Variable | Description |
|----------|-------------|
| `NOTIFY_CHANNEL_ID` | Channel ID for availability notifications |
| `LIBRARY_3_NAME` | Name of third library |
| `LIBRARY_3_TYPE` | Type: `movie` or `tv` |
| `LIBRARY_3_SERVER_ID` | Seerr server ID |
| `LIBRARY_4_NAME` | Name of fourth library |
| `LIBRARY_4_TYPE` | Type: `movie` or `tv` |
| `LIBRARY_4_SERVER_ID` | Seerr server ID |
| `ALLOWED_ROLE_ID` | Discord role ID required to use /request commands |
| `ADMIN_ROLE_ID` | Discord role ID required to use /linklist |

> You can add up to 10 libraries using `LIBRARY_1_*` through `LIBRARY_10_*`

---

## User Linking

Users can link their Discord account to their Seerr profile so requests show under their name and respect their quotas:

```
/link their-seerr-email@example.com
```

After linking, requests are submitted under their Seerr account. Unlinked users can still make requests — they go through the bot's default API user.

> If you use Plex login on Seerr, import users in **Seerr → Users → Import Plex Users**, then have them use `/link` with their email.

---

## How the Request Flow Works

1. User runs `/request-movies Inception`
2. Bot searches Seerr and shows a dropdown of results
3. User picks a title (TV shows get a season picker)
4. User confirms → bot sends request to Seerr API with the correct server/library
5. Bot posts a summary embed to your requests channel
6. Every 5 minutes the bot polls Seerr for status updates
7. When media becomes available, bot pings the requester in the notify channel

---

## Re-registering Commands

Run this any time you add/change libraries or after updating:

```bash
docker exec SeerrDiscordBot node src/register.js
```

Commands update instantly when `DISCORD_GUILD_ID` is set (guild commands). Without it, global commands can take up to 1 hour to propagate.

---

## Updating

When a new image is available:

**Unraid:** Click **Check for Updates** on the Docker page, then update.

**CLI:**
```bash
docker pull pejkaa/seerr-discord-bot:latest
docker stop SeerrDiscordBot && docker rm SeerrDiscordBot
# re-run your docker run command
docker exec SeerrDiscordBot node src/register.js
```

> Your data in `/app/data` is safe — it's stored in a volume outside the container.

---

## Data Persistence

All persistent data is stored in the mounted `/app/data` volume:

- `users.json` — Discord to Seerr account links
- `requests.json` — request tracking for status sync and notifications

This data survives container restarts, updates, and redeployments as long as you keep the volume mounted.

---

## Troubleshooting

**Bot not responding to commands:**
- Make sure you ran `docker exec SeerrDiscordBot node src/register.js`
- Check `DISCORD_GUILD_ID` is set correctly

**"Could not reach Seerr" error:**
- Verify `SEER_URL` includes the port and no trailing slash: `http://192.168.1.100:5055`
- Check `SEER_API_KEY` is correct
- Make sure Seerr is reachable from the container's network

**Requests going to wrong library:**
- Verify `LIBRARY_N_SERVER_ID` matches the ID in Seerr Settings → Radarr/Sonarr
- Re-register commands after changing library variables

**Users not showing after redeployment:**
- Check the data volume is mounted to the same path as before
- Copy `users.json` from the old data folder if needed

---

## Repositories

| Repo | Contents |
|------|----------|
| [pejkaa/seerr-discord-bot](https://github.com/pejkaa/seerr-discord-bot) | Bot source code, Dockerfile, Docker Compose |
| [pejkaa/unraid-templates](https://github.com/pejkaa/unraid-templates) | Unraid Community Apps XML template |

## Docker Hub

https://hub.docker.com/r/pejkaa/seerr-discord-bot
