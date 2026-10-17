require("dotenv").config();

const { Client, GatewayIntentBits, Partials, REST, Routes } = require("discord.js");
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

async function getTargetChannel() {
  const channel = await client.channels.fetch(process.env.CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased() || !channel.guild) {
    console.error("CHANNEL_ID must point to a text channel the bot can access.");
    return null;
  }
  return channel;
}

async function startSequence(channel) {
  sequenceStarted = true;
  sequenceFinished = false;
  nextMessageIndex = 0;
  activeGuildId = channel.guild.id;

  await channel.send({
    content: "🕵️ **A tiny friend-profile mystery has arrived!**\nThis is a playful surprise made from harmless favorites and hobbies—not private or identifying information.\nOwner, send any message in this server (even just `.`) to reveal the next clue, or use `/start` to restart the sequence.",
    allowedMentions: { parse: [] },
  });
}

client.once("ready", async () => {
  console.log("Logged in as " + client.user.tag);

  // Register /start independently of CHANNEL_ID so a channel misconfiguration
  // cannot prevent the slash command from appearing.
  try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
    const command = [{
      name: "start",
      description: "Manually start or restart the friend-profile mystery",
    }];

    for (const [guildId] of client.guilds.cache) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
        body: command,
      });
      console.log("Registered /start in guild " + guildId);
    }
  } catch (error) {
    console.error("Could not register /start. Check the bot's application permissions.");
    console.error(error.message);
  }

  const channel = await getTargetChannel();
  if (channel) {
    console.log("Waiting for the target user to join the server...");
  } else {
    console.error("Fix CHANNEL_ID in Railway Variables. Use the ID of the text channel where the mystery should appear.");
  }
});

client.on("guildMemberAdd", async (member) => {
  if (member.user.bot || member.id !== process.env.TARGET_USER_ID) return;

  const channel = await getTargetChannel();
  if (!channel || member.guild.id !== channel.guild.id) return;

  await startSequence(channel);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "start") return;

  if (interaction.user.id !== process.env.OWNER_ID) {
    await interaction.reply({ content: "Only the bot owner can use this command.", ephemeral: true });
    return;
  }

  const channel = await getTargetChannel();
  if (!channel || interaction.guildId !== channel.guild.id) {
    await interaction.reply({ content: "The configured bot channel isn't available in this server. Please fix CHANNEL_ID in Railway Variables.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  await startSequence(channel);
  await interaction.editReply("✅ Mystery started! Send any message to reveal the first clue.");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || message.author.id !== process.env.OWNER_ID) return;
  if (!message.guild || message.guild.id !== activeGuildId) return;
  if (!sequenceStarted || sequenceFinished) return;

  const channel = await getTargetChannel();
  if (!channel) return;

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
