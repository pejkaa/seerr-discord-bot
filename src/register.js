require('dotenv').config();
const { REST, Routes } = require('discord.js');
const commands = require('./commands');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  const guildId = process.env.DISCORD_GUILD_ID;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId || !process.env.DISCORD_TOKEN) { console.error('❌ DISCORD_CLIENT_ID and DISCORD_TOKEN required'); process.exit(1); }
  const body = commands.map(c => c.data.toJSON());
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      console.log(`✅ Registered ${body.length} guild commands`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log(`✅ Registered ${body.length} global commands (up to 1hr to propagate)`);
    }
  } catch (e) { console.error('❌ Failed:', e); }
})();
