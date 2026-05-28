const axios = require('axios');

function client() {
  return axios.create({
    baseURL: `${process.env.SEER_URL}/api/v1`,
    headers: { 'X-Api-Key': process.env.SEER_API_KEY },
    timeout: 15000,
  });
}

async function search(query) {
  const encoded = encodeURIComponent(query);
  const res = await client().get(`/search?query=${encoded}&page=1`);
  return res.data.results || [];
}

async function getMovie(tmdbId) {
  const res = await client().get(`/movie/${tmdbId}`);
  return res.data;
}

async function getTv(tmdbId) {
  const res = await client().get(`/tv/${tmdbId}`);
  return res.data;
}

async function request({ mediaType, tmdbId, seasons, userId, is4k = false, serverId }) {
  const body = { mediaType, mediaId: tmdbId, is4k };
  if (mediaType === 'tv') body.seasons = seasons && seasons.length > 0 ? seasons : undefined;
  if (userId) body.userId = userId;
  if (serverId !== undefined) body.serverId = serverId;
  const res = await client().post('/request', body);
  return res.data;
}

async function getUsers() {
  const res = await client().get('/user', { params: { take: 100 } });
  return res.data.results || [];
}

async function getRequestStatus(seerRequestId) {
  const res = await client().get(`/request/${seerRequestId}`);
  return res.data;
}

async function testConnection() {
  try { await client().get('/settings/main'); return true; } catch { return false; }
}

const MEDIA_STATUS = {
  1: 'unknown', 2: 'pending', 3: 'processing', 4: 'partially_available', 5: 'available',
};

module.exports = { search, getMovie, getTv, request, getUsers, getRequestStatus, testConnection, MEDIA_STATUS };
