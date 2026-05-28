const cron = require('node-cron');
const seer = require('./seer');
const store = require('./store');
const embeds = require('./embeds');

const STATUS_MAP = { 1: 'unknown', 2: 'pending', 3: 'processing', 4: 'partially_available', 5: 'available' };

async function syncStatuses(client) {
  const pending = store.getPendingRequests();
  if (!pending.length) return;
  for (const tracked of pending) {
    try {
      const seerReq = await seer.getRequestStatus(tracked.seerRequestId);
      const newStatus = STATUS_MAP[seerReq.media?.status] || tracked.status;
      if (newStatus === tracked.status) continue;
      store.updateRequestStatus(tracked.seerRequestId, newStatus);
      console.log(`[Sync] "${tracked.title}": ${tracked.status} → ${newStatus}`);
      if (newStatus === 'available' && !tracked.notified) {
        store.markNotified(tracked.seerRequestId);
        const notifyChannelId = process.env.NOTIFY_CHANNEL_ID || process.env.REQUESTS_CHANNEL_ID;
        if (notifyChannelId) {
          try {
            const channel = await client.channels.fetch(notifyChannelId);
            await channel.send({ content: `<@${tracked.discordUserId}>`, embeds: [embeds.availableEmbed(tracked)] });
          } catch (e) { console.error('[Sync] Failed to notify:', e.message); }
        }
      }
    } catch (e) {
      if (e.response?.status === 404) store.updateRequestStatus(tracked.seerRequestId, 'declined');
    }
  }
}

function startSync(client) {
  cron.schedule('*/5 * * * *', () => syncStatuses(client).catch(e => console.error('[Sync] Error:', e.message)));
  console.log('[Sync] Status poller started (every 5 min)');
}

module.exports = { startSync };
