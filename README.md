# Mini — Discord Friend Surprise Bot

A small Discord bot that starts a one-time sequence when a chosen member joins the configured server. Each message from the configured owner reveals the next clue; the sequence ends after the final clue and does not loop.

The sample clues are limited to lighthearted interests and favorites. **Do not add private, identifying, or sensitive details** (such as addresses, live location, school, phone numbers, account credentials, or information the person has not agreed to share). For a surprise, keep it fun—not invasive.

## Setup

1. Install Node.js 20 or newer.
2. Create a Discord application and bot in the Discord Developer Portal.
3. Enable the **Server Members Intent** and **Message Content Intent** under *Bot → Privileged Gateway Intents*.
4. Invite the bot with permission to view the server/channel and send messages.
5. Copy `.env.example` to `.env` and fill in the values:
   - `DISCORD_TOKEN`: bot token (keep it secret; never commit it)
   - `OWNER_ID`: your Discord user ID; only messages from this account advance the sequence
   - `TARGET_USER_ID`: the member whose join starts the sequence
   - `CHANNEL_ID`: the text channel where all sequence messages are posted
6. Install dependencies and start:
   ```bash
   npm install
   npm start
   ```

## Behavior

- The configured target joining the server that contains `CHANNEL_ID` starts the sequence.
- The intro message is sent automatically.
- Every non-bot message from `OWNER_ID` in that same server advances one clue—even a single dot.
- Other members' messages do not advance it.
- It stops after the last clue. It will start a fresh sequence if the target leaves and joins again.
- Keep the bot online for the join event to be detected.

## Railway

Deploy this repository as a Node.js service and add the four environment variables in the service's Variables settings. Do not upload your actual `.env` file or share your bot token.
