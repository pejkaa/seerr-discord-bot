const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
  if (!fs.existsSync(REQUESTS_FILE)) fs.writeFileSync(REQUESTS_FILE, '[]');
}

function readUsers() {
  ensureFiles();
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return {}; }
}
function writeUsers(data) { ensureFiles(); fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2)); }

function linkUser(discordId, seerUserId, seerUserName) {
  const users = readUsers();
  users[discordId] = { seerUserId, seerUserName, linkedAt: new Date().toISOString() };
  writeUsers(users);
}
function unlinkUser(discordId) { const u = readUsers(); delete u[discordId]; writeUsers(u); }
function getLinkedUser(discordId) { return readUsers()[discordId] || null; }
function getAllLinkedUsers() { return readUsers(); }

function readRequests() {
  ensureFiles();
  try { return JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8')); } catch { return []; }
}
function writeRequests(data) { ensureFiles(); fs.writeFileSync(REQUESTS_FILE, JSON.stringify(data, null, 2)); }

function trackRequest({ discordUserId, discordMessageId, seerRequestId, title, mediaType, posterPath, year }) {
  const requests = readRequests();
  requests.unshift({ id: `${Date.now()}`, discordUserId, discordMessageId, seerRequestId, title, mediaType, posterPath, year, status: 'pending', createdAt: new Date().toISOString(), notified: false });
  writeRequests(requests);
}

function updateRequestStatus(seerRequestId, status) {
  const requests = readRequests();
  const idx = requests.findIndex(r => String(r.seerRequestId) === String(seerRequestId));
  if (idx === -1) return null;
  requests[idx].status = status;
  requests[idx].updatedAt = new Date().toISOString();
  writeRequests(requests);
  return requests[idx];
}

function markNotified(seerRequestId) {
  const requests = readRequests();
  const idx = requests.findIndex(r => String(r.seerRequestId) === String(seerRequestId));
  if (idx !== -1) { requests[idx].notified = true; writeRequests(requests); }
}

function getPendingRequests() { return readRequests().filter(r => !['available', 'declined'].includes(r.status)); }
function getRequestBySeerRequestId(seerRequestId) { return readRequests().find(r => String(r.seerRequestId) === String(seerRequestId)) || null; }

module.exports = { linkUser, unlinkUser, getLinkedUser, getAllLinkedUsers, trackRequest, updateRequestStatus, markNotified, getPendingRequests, getRequestBySeerRequestId };
