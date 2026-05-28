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

function getLibraryByName(name) {
  return getLibraries().find(l => l.name === name) || getLibraries()[0];
}

async function handleSelectMedia(interaction) {
  const [mediaType, tmdbId] = interaction.values[0].split(':');
  await interaction.deferUpdate();
  const cached = interaction.client._searchCache?.get(interaction.user.id);
  const lib = cached?.libraryName ? getLibraryByName(cached.libraryName) : getLibraries().find(l => l.mediaType === mediaType) || getLibraries()[0];
  let details;
  try {
    details = mediaType === 'movie' ? await seer.getMovie(tmdbId) : await seer.getTv(tmdbId);
    details.mediaType = mediaType;
  } catch (e) {
    return interaction.editReply({ embeds: [embeds.errorEmbed('Failed to fetch details: ' + e.message)], components: [] });
  }
  const mediaInfo = details.mediaInfo;
  if (mediaInfo?.status === 5) return interaction.editReply({ embeds: [embeds.mediaEmbed(details, { status: 'available' }).setFooter({ text: 'Already available!' })], components: [] });
  if (mediaInfo?.status && mediaInfo.status > 1) return interaction.editReply({ embeds: [embeds.mediaEmbed(details, { status: seer.MEDIA_STATUS[mediaInfo.status] }).setFooter({ text: 'Already requested in Jellyseerr' })], components: [] });
  interaction.client._detailsCache = interaction.client._detailsCache || new Map();
  interaction.client._detailsCache.set(interaction.user.id, { details, libraryName: lib.name, expiresAt: Date.now() + 5 * 60 * 1000 });
  if (mediaType === 'tv') {
    const seasonSelect = embeds.buildSeasonSelect(details);
    if (seasonSelect) {
      return interaction.editReply({ embeds: [embeds.mediaEmbed(details).setFooter({ text: 'Step 2 — choose seasons (' + lib.label + ')' })], components: [seasonSelect] });
    }
  }
  await interaction.editReply({ embeds: [embeds.mediaEmbed(details).setFooter({ text: 'Library: ' + lib.label + ' — confirm below' })], components: [embeds.buildConfirmRow(mediaType, tmdbId, null)] });
}

async function handleSelectSeasons(interaction) {
  const cached = interaction.client._detailsCache?.get(interaction.user.id);
  if (!cached || Date.now() > cached.expiresAt) return interaction.update({ embeds: [embeds.errorEmbed('Session expired. Please run the command again.')], components: [] });
  await interaction.deferUpdate();
  const { details, libraryName } = cached;
  const lib = getLibraryByName(libraryName);
  const selected = interaction.values;
  const isAll = selected.includes('all');
  const allSeasonNumbers = Array.isArray(details.seasons) ? details.seasons.filter(s => s.seasonNumber > 0).map(s => s.seasonNumber) : [];
  const seasons = isAll ? allSeasonNumbers : selected.map(Number);
  const confirmRow = embeds.buildConfirmRow('tv', details.id, seasons);
  const seasonText = isAll ? 'All seasons' : 'Season(s): ' + seasons.join(', ');
  await interaction.editReply({ embeds: [embeds.mediaEmbed(details).setFooter({ text: seasonText + ' · Library: ' + lib.label + ' — confirm below' })], components: [confirmRow] });
}

async function handleConfirmRequest(interaction) {
  await interaction.deferUpdate();
  const parts = interaction.customId.replace('confirm_request:', '').split(':');
  const mediaType = parts[0];
  const tmdbId = parts[1];
  const seasons = parts[2] ? parts[2].split(',').map(Number) : null;
  const cached = interaction.client._detailsCache?.get(interaction.user.id);
  const lib = cached?.libraryName ? getLibraryByName(cached.libraryName) : getLibraries().find(l => l.mediaType === mediaType) || getLibraries()[0];
  const linked = store.getLinkedUser(interaction.user.id);
  let details;
  try {
    details = mediaType === 'movie' ? await seer.getMovie(tmdbId) : await seer.getTv(tmdbId);
    details.mediaType = mediaType;
  } catch (e) {
    return interaction.editReply({ embeds: [embeds.errorEmbed('Failed to fetch details: ' + e.message)], components: [] });
  }
  const requestBody = { mediaType, tmdbId: Number(tmdbId), is4k: false, serverId: lib.serverId };
  if (linked?.seerUserId) requestBody.userId = linked.seerUserId;
  if (mediaType === 'tv' && seasons && seasons.length > 0) requestBody.seasons = seasons;
  let seerRequest;
  try {
    seerRequest = await seer.request(requestBody);
  } catch (e) {
    const msg = e.response?.data?.message || e.message;
    if (e.response?.status === 409 || msg?.toLowerCase().includes('already')) {
      return interaction.editReply({ embeds: [embeds.infoEmbed('Already requested', (details.title || details.name) + ' has already been requested.')], components: [] });
    }
    return interaction.editReply({ embeds: [embeds.errorEmbed('Jellyseerr error: ' + msg)], components: [] });
  }
  const title = details.title || details.name;
  const year = (details.releaseDate || details.firstAirDate || '').slice(0, 4);
  let channelMessage = null;
  if (process.env.REQUESTS_CHANNEL_ID) {
    try {
      const channel = await interaction.client.channels.fetch(process.env.REQUESTS_CHANNEL_ID);
      channelMessage = await channel.send({ embeds: [embeds.requestPostedEmbed(details, interaction.user, lib.label)] });
    } catch (e) { console.error('[Channel] Failed to post:', e.message); }
  }
  store.trackRequest({ discordUserId: interaction.user.id, discordMessageId: channelMessage?.id || null, seerRequestId: seerRequest.id, title, mediaType, posterPath: details.posterPath || null, year });
  const linkedNote = linked ? '' : '\n> Use /link to connect your Jellyseerr account.';
  await interaction.editReply({ embeds: [embeds.successEmbed('Request submitted!', title + (year ? ' (' + year + ')' : '') + ' has been sent to ' + lib.label + '.' + linkedNote)], components: [] });
}

async function handleInteraction(interaction) {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    try { await command.execute(interaction); } catch (e) {
      console.error('[Command] /' + interaction.commandName + ' error:', e);
      const reply = { embeds: [embeds.errorEmbed('Something went wrong.')], ephemeral: true };
      if (interaction.deferred || interaction.replied) interaction.editReply(reply); else interaction.reply(reply);
    }
    return;
  }
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'select_media') return handleSelectMedia(interaction);
    if (interaction.customId === 'select_seasons') return handleSelectSeasons(interaction);
  }
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('confirm_request:')) return handleConfirmRequest(interaction);
    if (interaction.customId === 'cancel_request') return interaction.update({ embeds: [embeds.infoEmbed('Cancelled', 'Request cancelled.')], components: [] });
  }
}

module.exports = { handleInteraction };
