const { SlashCommandBuilder } = require('discord.js');
const seer = require('./seer');
const store = require('./store');
const embeds = require('./embeds');

function getLibraries() {
  const libraries = [];
  for (let i = 1; i <= 10; i++) {
    const name = process.env[`LIBRARY_${i}_NAME`];
    const type = process.env[`LIBRARY_${i}_TYPE`];
    const serverId = process.env[`LIBRARY_${i}_SERVER_ID`];
    if (name && type) {
      libraries.push({
        name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        label: name,
        mediaType: type === 'movie' ? 'movie' : 'tv',
        serverId: serverId !== undefined ? Number(serverId) : 0,
      });
    }
  }
  if (libraries.length === 0) {
    libraries.push({ name: 'movies', label: 'Movies', mediaType: 'movie', serverId: 0 });
    libraries.push({ name: 'tv-shows', label: 'TV Shows', mediaType: 'tv', serverId: 0 });
  }
  return libraries;
}

function makeRequestCommand(lib) {
  return {
    data: new SlashCommandBuilder()
      .setName(`request-${lib.name}`)
      .setDescription(`Request a ${lib.label}`)
      .addStringOption(o => o.setName('title').setDescription('Title to search for').setRequired(true)),

    async execute(interaction) {
      if (process.env.ALLOWED_ROLE_ID && !interaction.member.roles.cache.has(process.env.ALLOWED_ROLE_ID)) {
        return interaction.reply({ embeds: [embeds.errorEmbed('You don\'t have permission to use this command.')], ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const query = interaction.options.getString('title');
      let results;
      try {
        results = await seer.search(query);
        results = results.filter(r => r.mediaType === lib.mediaType);
      } catch (e) {
        return interaction.editReply({ embeds: [embeds.errorEmbed(`Could not reach Jellyseerr: ${e.message}`)] });
      }
      if (!results.length) {
        return interaction.editReply({ embeds: [embeds.errorEmbed(`No ${lib.label} found for **${query}**`)] });
      }
      interaction.client._searchCache = interaction.client._searchCache || new Map();
      interaction.client._searchCache.set(interaction.user.id, {
        results, mediaType: lib.mediaType, libraryName: lib.name, expiresAt: Date.now() + 5 * 60 * 1000,
      });
      await interaction.editReply({ embeds: [embeds.searchResultsEmbed(results, query, lib.label)], components: [embeds.buildSearchSelect(results)] });
    },
  };
}

const linkCommand = {
  data: new SlashCommandBuilder().setName('link').setDescription('Link your Discord account to a Jellyseerr user').addStringOption(o => o.setName('email').setDescription('Your Jellyseerr account email').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const email = interaction.options.getString('email').trim().toLowerCase();
    let users;
    try { users = await seer.getUsers(); } catch (e) {
      return interaction.editReply({ embeds: [embeds.errorEmbed(`Could not reach Jellyseerr: ${e.message}`)] });
    }
    const match = users.find(u => u.email?.toLowerCase() === email);
    if (!match) return interaction.editReply({ embeds: [embeds.errorEmbed(`No Jellyseerr user found with email **${email}**.\n\nMake sure you have an account in Jellyseerr first.`)] });
    store.linkUser(interaction.user.id, match.id, match.displayName || match.username);
    await interaction.editReply({ embeds: [embeds.successEmbed('Account linked!', `Your Discord account is now linked to Jellyseerr user **${match.displayName || match.username}**.`)] });
  },
};

const unlinkCommand = {
  data: new SlashCommandBuilder().setName('unlink').setDescription('Unlink your Discord account from Jellyseerr'),
  async execute(interaction) {
    const linked = store.getLinkedUser(interaction.user.id);
    if (!linked) return interaction.reply({ embeds: [embeds.infoEmbed('Not linked', 'Your account is not currently linked.')], ephemeral: true });
    store.unlinkUser(interaction.user.id);
    await interaction.reply({ embeds: [embeds.successEmbed('Unlinked', `Unlinked from **${linked.seerUserName}**.`)], ephemeral: true });
  },
};

const whoisCommand = {
  data: new SlashCommandBuilder().setName('whois').setDescription('Check which Jellyseerr account a Discord user is linked to').addUserOption(o => o.setName('user').setDescription('Discord user to check').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const linked = store.getLinkedUser(target.id);
    if (!linked) return interaction.reply({ embeds: [embeds.infoEmbed('Not linked', `**${target.username}** is not linked to any Jellyseerr account.`)], ephemeral: true });
    await interaction.reply({ embeds: [embeds.infoEmbed('Account linked', `**${target.username}** → Jellyseerr user **${linked.seerUserName}** (ID: ${linked.seerUserId})\nLinked: <t:${Math.floor(new Date(linked.linkedAt).getTime() / 1000)}:R>`)], ephemeral: true });
  },
};

const linklistCommand = {
  data: new SlashCommandBuilder().setName('linklist').setDescription('List all Discord <-> Jellyseerr user links (admin only)'),
  async execute(interaction) {
    if (process.env.ADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
      return interaction.reply({ embeds: [embeds.errorEmbed('Admin only.')], ephemeral: true });
    }
    const all = store.getAllLinkedUsers();
    const entries = Object.entries(all);
    if (!entries.length) return interaction.reply({ embeds: [embeds.infoEmbed('No links', 'No Discord users are linked yet.')], ephemeral: true });
    const lines = entries.map(([id, data]) => `<@${id}> → **${data.seerUserName}** (ID: ${data.seerUserId})`).join('\n');
    await interaction.reply({ embeds: [embeds.infoEmbed(`Linked users (${entries.length})`, lines.slice(0, 3800))], ephemeral: true });
  },
};

const statusCommand = {
  data: new SlashCommandBuilder().setName('seer-status').setDescription('Check if the bot can reach Jellyseerr'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const ok = await seer.testConnection();
    const linked = store.getLinkedUser(interaction.user.id);
    const libs = getLibraries();
    await interaction.editReply({ embeds: [embeds.infoEmbed('Bot Status',
      `Jellyseerr: ${ok ? '🟢 Connected' : '🔴 Unreachable'} (${process.env.SEER_URL})\n` +
      `Your account: ${linked ? `🔗 Linked to **${linked.seerUserName}**` : '🔓 Not linked — use /link to connect'}\n` +
      `Libraries: ${libs.map(l => `/request-${l.name}`).join(', ')}`
    )] });
  },
};

const libraries = getLibraries();
const requestCommands = libraries.map(makeRequestCommand);
console.log(`[Commands] Libraries: ${libraries.map(l => `/request-${l.name}`).join(', ')}`);

module.exports = [...requestCommands, linkCommand, unlinkCommand, whoisCommand, linklistCommand, statusCommand];
