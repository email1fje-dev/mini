require("dotenv").config();

const { Client, GatewayIntentBits, Partials } = require("discord.js");
const messages = require("./messages.json");

const required = ["DISCORD_TOKEN", "OWNER_ID", "TARGET_USER_ID", "CHANNEL_ID"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("Missing required environment variables: " + missing.join(", "));
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

let sequenceStarted = false;
let nextMessageIndex = 0;
let sequenceFinished = false;
let activeGuildId = null;

client.once("ready", () => {
  console.log("Logged in as " + client.user.tag);
  console.log("Waiting for the target user to join the server...");
});

client.on("guildMemberAdd", async (member) => {
  if (member.user.bot || member.id !== process.env.TARGET_USER_ID) return;

  const channel = await client.channels.fetch(process.env.CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased() || !channel.guild) {
    console.error("CHANNEL_ID must point to a text channel the bot can access.");
    return;
  }
  if (member.guild.id !== channel.guild.id) return;

  sequenceStarted = true;
  sequenceFinished = false;
  nextMessageIndex = 0;
  activeGuildId = member.guild.id;

  await channel.send({
    content: "🕵️ **A tiny friend-profile mystery has arrived!**\nThis is a playful surprise made from harmless favorites and hobbies—not private or identifying information.\nOwner, send any message in this server (even just `.`) to reveal the next clue.",
    allowedMentions: { parse: [] },
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || message.author.id !== process.env.OWNER_ID) return;
  if (!message.guild || message.guild.id !== activeGuildId) return;
  if (!sequenceStarted || sequenceFinished) return;

  const channel = await client.channels.fetch(process.env.CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.error("Could not access CHANNEL_ID.");
    return;
  }

  const item = messages[nextMessageIndex];
  if (!item) {
    sequenceFinished = true;
    sequenceStarted = false;
    await channel.send("✅ **Mystery complete!** That's all the clues—no looping this time. 🎉");
    return;
  }

  await channel.send({ content: item, allowedMentions: { parse: [] } });
  nextMessageIndex += 1;

  if (nextMessageIndex >= messages.length) {
    sequenceFinished = true;
    sequenceStarted = false;
    await channel.send("🎉 **That's the final clue!** Mystery complete. Thanks for playing!");
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("Discord login failed. Check DISCORD_TOKEN and try again.");
  console.error(error.message);
  process.exit(1);
});
