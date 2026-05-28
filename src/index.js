require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const commands = require('./commands');
const { handleInteraction } = require('./interactions');
const { startSync } = require('./sync');

const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'SEER_URL', 'SEER_API_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) { console.error(`\n❌ Missing env vars: ${missing.join(', ')}\n`); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
for (const command of commands) client.commands.set(command.data.name, command);

client.once('ready', () => {
  console.log(`\n🤖 Seer Discord Bot ready as ${client.user.tag}`);
  console.log(`   Jellyseerr: ${process.env.SEER_URL}`);
  console.log(`   Requests channel: ${process.env.REQUESTS_CHANNEL_ID || '(not set)'}\n`);
  startSync(client);
});

client.on('interactionCreate', handleInteraction);
client.on('error', e => console.error('[Discord] Error:', e));
client.login(process.env.DISCORD_TOKEN);
