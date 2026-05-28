const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w342';

const COLORS = {
  primary: 0x6366f1, success: 0x22c55e, warning: 0xf59e0b,
  error: 0xef4444, info: 0x3b82f6, available: 0x22c55e, pending: 0xf59e0b,
};

function mediaEmbed(media, { status, requestedBy } = {}) {
  const title = media.title || media.name;
  const year = (media.releaseDate || media.firstAirDate || '').slice(0, 4);
  const overview = media.overview?.length > 300 ? media.overview.slice(0, 297) + '…' : media.overview;
  const embed = new EmbedBuilder().setTitle(`${title}${year ? ` (${year})` : ''}`).setColor(COLORS.primary).setDescription(overview || null);
  if (media.posterPath) embed.setThumbnail(`${TMDB_IMAGE}${media.posterPath}`);
  const fields = [];
  fields.push({ name: 'Type', value: media.mediaType === 'movie' ? '🎬 Movie' : '📺 TV Show', inline: true });
  if (media.voteAverage) fields.push({ name: 'Rating', value: `⭐ ${media.voteAverage.toFixed(1)}/10`, inline: true });
  if (media.mediaType === 'tv' && media.numberOfSeasons) fields.push({ name: 'Seasons', value: String(media.numberOfSeasons), inline: true });
  if (requestedBy) fields.push({ name: 'Requested by', value: `<@${requestedBy}>`, inline: true });
  if (status) fields.push({ name: 'Status', value: statusLabel(status), inline: true });
  embed.addFields(fields);
  return embed;
}

function searchResultsEmbed(results, query, libraryLabel) {
  return new EmbedBuilder()
    .setTitle(`Search results for "${query}"`)
    .setColor(COLORS.info)
    .setDescription(`Select a title below to request it${libraryLabel ? ` in **${libraryLabel}**` : ''}.`)
    .setFooter({ text: `${results.length} result${results.length !== 1 ? 's' : ''} found` });
}

function successEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${title}`).setDescription(description);
}

function errorEmbed(description) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Error').setDescription(description);
}

function infoEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.info).setTitle(title).setDescription(description);
}

function availableEmbed(tracked) {
  const embed = new EmbedBuilder().setColor(COLORS.available).setTitle('🎉 Now Available!').setDescription(`**${tracked.title}** is now available to watch!`).addFields({ name: 'Type', value: tracked.mediaType === 'movie' ? '🎬 Movie' : '📺 TV Show', inline: true });
  if (tracked.posterPath) embed.setThumbnail(`${TMDB_IMAGE}${tracked.posterPath}`);
  return embed;
}

function requestPostedEmbed(media, discordUser, libraryLabel) {
  const title = media.title || media.name;
  const year = (media.releaseDate || media.firstAirDate || '').slice(0, 4);
  const embed = new EmbedBuilder()
    .setColor(COLORS.pending)
    .setTitle(`📥 New Request — ${title}${year ? ` (${year})` : ''}`)
    .addFields(
      { name: 'Requested by', value: `<@${discordUser.id}> (${discordUser.username})`, inline: true },
      { name: 'Type', value: media.mediaType === 'movie' ? '🎬 Movie' : '📺 TV Show', inline: true },
      { name: 'Library', value: libraryLabel || 'Default', inline: true },
      { name: 'Status', value: statusLabel('pending'), inline: true },
    )
    .setTimestamp();
  if (media.posterPath) embed.setThumbnail(`${TMDB_IMAGE}${media.posterPath}`);
  if (media.overview) embed.setDescription(media.overview.length > 200 ? media.overview.slice(0, 197) + '…' : media.overview);
  return embed;
}

function buildSearchSelect(results) {
  const options = results.slice(0, 25).map(r => {
    const year = (r.releaseDate || r.firstAirDate || '').slice(0, 4);
    const title = (r.title || r.name || 'Unknown').slice(0, 80);
    return {
      label: `${title}${year ? ` (${year})` : ''}`.slice(0, 100),
      description: `${r.mediaType === 'movie' ? '🎬 Movie' : '📺 TV Show'}${r.voteAverage ? ` · ⭐ ${r.voteAverage.toFixed(1)}` : ''}`,
      value: `${r.mediaType}:${r.id}`,
    };
  });
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_media').setPlaceholder('Choose a title…').addOptions(options));
}

function buildSeasonSelect(tvDetails) {
  const seasons = (tvDetails.seasons || []).filter(s => s.seasonNumber > 0);
  if (!seasons.length) return null;
  const options = [
    { label: 'All seasons', description: `Request all ${seasons.length} season(s)`, value: 'all' },
    ...seasons.slice(0, 24).map(s => ({ label: `Season ${s.seasonNumber}`, description: s.name || `Season ${s.seasonNumber}`, value: String(s.seasonNumber) })),
  ];
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_seasons').setPlaceholder('Choose seasons…').setMinValues(1).setMaxValues(Math.min(options.length, 25)).addOptions(options));
}

function buildConfirmRow(mediaType, tmdbId, seasons) {
  const value = seasons ? `${mediaType}:${tmdbId}:${seasons.join(',')}` : `${mediaType}:${tmdbId}`;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`confirm_request:${value}`).setLabel('Confirm Request').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId('cancel_request').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );
}

function statusLabel(status) {
  const map = { pending: '🟡 Pending', processing: '🔵 Processing', available: '🟢 Available', partially_available: '🟠 Partially Available', declined: '🔴 Declined' };
  return map[status] || status;
}

module.exports = { mediaEmbed, searchResultsEmbed, successEmbed, errorEmbed, infoEmbed, availableEmbed, requestPostedEmbed, buildSearchSelect, buildSeasonSelect, buildConfirmRow, COLORS };
