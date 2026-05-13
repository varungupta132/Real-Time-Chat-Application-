var token = localStorage.getItem('token');
var currentUser = JSON.parse(localStorage.getItem('user'));
if (!token || !currentUser) window.location.href = '/';

// State
var allUsers = [];
var activeChat = null;   // { type: 'dm'|'channel', id, name }
var lastMessageTime = null;
var pollInterval = null;
var userPollInterval = null;

var DEPARTMENTS = ['General','Engineering','Design','Marketing','Sales','HR','Finance','Operations'];
var COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

function getColor(str) {
  var n = 0;
  for (var i = 0; i < str.length; i++) n += str.charCodeAt(i);
  return COLORS[n % COLORS.length];
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Boot ─────────────────────────────────────────────────────────────────────

window.onload = function () {
  document.getElementById('orgName').textContent = currentUser.organization;
  document.getElementById('userName').textContent = currentUser.name || currentUser.username;
  
  var orgIcon = document.getElementById('orgIcon');
  orgIcon.textContent = initials(currentUser.organization);
  orgIcon.style.background = getColor(currentUser.organization);

  if (currentUser.role === 'admin') {
    document.getElementById('adminSection').style.display = 'block';
    loadPendingCount();
  }

  renderChannels();
  loadUsers();

  setStatus(true);
  userPollInterval = setInterval(loadUsers, 15000);
  window.addEventListener('beforeunload', () => setStatus(false));
};

// ── API ───────────────────────────────────────────────────────────────────────

function api(method, url, body) {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  }).then(res => {
    if (res.status === 401) logout();
    return res.json();
  });
}

function setStatus(online) { api('POST', '/api/status', { isOnline: online }); }

// ── Channels ──────────────────────────────────────────────────────────────────

function renderChannels() {
  var list = document.getElementById('channelsList');
  list.innerHTML = '';
  DEPARTMENTS.forEach(function (dept) {
    var li = document.createElement('li');
    li.className = 'sidebar-item' + (activeChat && activeChat.type === 'channel' && activeChat.id === dept ? ' active' : '');
    li.onclick = function () { openChannel(dept); };
    li.innerHTML =
      '<span class="item-icon channel-icon">#</span>' +
      '<span class="item-name">' + dept.toLowerCase() + '</span>';
    list.appendChild(li);
  });
}

async function openChannel(name) {
  activeChat = { type: 'channel', id: name, name: '#' + name };
  lastMessageTime = null;
  renderChannels();
  renderDMs();

  showChatArea();
  document.getElementById('chatIcon').textContent = '#';
  document.getElementById('chatIcon').style.background = getColor(name);
  document.getElementById('chatTitle').textContent = '#' + name.toLowerCase();
  document.getElementById('chatSubtitle').textContent = name + ' channel';
  document.getElementById('onlineCount').textContent = '';
  document.getElementById('messagesList').innerHTML = '';

  const msgs = await api('GET', '/api/channel/' + name);
  if (Array.isArray(msgs)) {
    msgs.forEach(m => showMessage(m, 'channel'));
    if (msgs.length) lastMessageTime = msgs[msgs.length - 1].createdAt;
    scrollDown();
  }

  clearInterval(pollInterval);
  pollInterval = setInterval(pollChannel, 2000);
  document.getElementById('messageInput').focus();
}

async function pollChannel() {
  if (!activeChat || activeChat.type !== 'channel') return;
  var url = '/api/channel/' + activeChat.id + '/poll' + (lastMessageTime ? '?since=' + encodeURIComponent(lastMessageTime) : '');
  const msgs = await api('GET', url);
  if (!Array.isArray(msgs) || !msgs.length) return;
  msgs.forEach(m => showMessage(m, 'channel'));
  lastMessageTime = msgs[msgs.length - 1].createdAt;
  scrollDown();
}

// ── Users / DMs ───────────────────────────────────────────────────────────────

async function loadUsers() {
  const users = await api('GET', '/api/users');
  if (!Array.isArray(users)) return;
  allUsers = users;
  renderDMs();
}

function renderDMs() {
  var search = document.getElementById('searchInput').value.toLowerCase();
  var list = document.getElementById('dmsList');
  list.innerHTML = '';

  allUsers.forEach(function (user) {
    if (search && !user.name.toLowerCase().includes(search) && !user.username.toLowerCase().includes(search)) return;

    var li = document.createElement('li');
    li.className = 'sidebar-item' + (activeChat && activeChat.type === 'dm' && activeChat.id === user._id ? ' active' : '');
    li.onclick = function () { openDM(user); };

    li.innerHTML =
      '<div class="user-av-small" style="background:' + getColor(user.username) + '">' +
        initials(user.name || user.username) +
        '<span class="status-pip ' + (user.isOnline ? 'on' : 'off') + '"></span>' +
      '</div>' +
      '<div class="item-details">' +
        '<span class="item-name">' + (user.name || user.username) + '</span>' +
        '<span class="item-sub">' + (user.department || '') + '</span>' +
      '</div>';
    list.appendChild(li);
  });
}

async function openDM(user) {
  activeChat = { type: 'dm', id: user._id, name: user.name || user.username, user };
  lastMessageTime = null;
  renderDMs();
  renderChannels();

  showChatArea();
  var icon = document.getElementById('chatIcon');
  icon.textContent = initials(user.name || user.username);
  icon.style.background = getColor(user.username);
  document.getElementById('chatTitle').textContent = user.name || user.username;
  document.getElementById('chatSubtitle').textContent = (user.department || '') + (user.isOnline ? ' · Online' : ' · Offline');
  document.getElementById('onlineCount').textContent = '';
  document.getElementById('messagesList').innerHTML = '';

  const msgs = await api('GET', '/api/messages/' + user._id);
  if (Array.isArray(msgs)) {
    msgs.forEach(m => showMessage(m, 'dm'));
    if (msgs.length) lastMessageTime = msgs[msgs.length - 1].createdAt;
    scrollDown();
  }

  clearInterval(pollInterval);
  pollInterval = setInterval(pollDM, 2000);
  document.getElementById('messageInput').focus();
}

async function pollDM() {
  if (!activeChat || activeChat.type !== 'dm') return;
  var url = '/api/messages/' + activeChat.id + '/poll' + (lastMessageTime ? '?since=' + encodeURIComponent(lastMessageTime) : '');
  const msgs = await api('GET', url);
  if (!Array.isArray(msgs) || !msgs.length) return;
  msgs.forEach(m => showMessage(m, 'dm'));
  lastMessageTime = msgs[msgs.length - 1].createdAt;
  scrollDown();
}

// ── Messages ──────────────────────────────────────────────────────────────────

function showMessage(msg, type) {
  var senderId = msg.sender._id || msg.sender;
  var isMine = senderId === currentUser.id;
  var senderName = msg.sender.name || msg.sender.username || 'Unknown';

  var div = document.createElement('div');
  div.className = 'msg-row ' + (isMine ? 'mine' : 'theirs');

  var avatarHtml = !isMine ?
    '<div class="msg-avatar" style="background:' + getColor(msg.sender.username || '') + '">' + initials(senderName) + '</div>' : '';

  div.innerHTML =
    avatarHtml +
    '<div class="msg-body">' +
      (!isMine && type === 'channel' ? '<span class="msg-sender">' + senderName + ' <small>' + (msg.sender.department || '') + '</small></span>' : '') +
      '<div class="msg-bubble">' + escapeHtml(msg.content) + '</div>' +
      '<span class="msg-time">' + formatTime(msg.createdAt) + '</span>' +
    '</div>';

  document.getElementById('messagesList').appendChild(div);
}

async function sendMessage(e) {
  e.preventDefault();
  var input = document.getElementById('messageInput');
  var content = input.value.trim();
  if (!content || !activeChat) return;
  input.value = '';

  var msg;
  if (activeChat.type === 'channel') {
    msg = await api('POST', '/api/channel/' + activeChat.id, { content });
  } else {
    msg = await api('POST', '/api/messages', { receiverId: activeChat.id, content });
  }

  if (msg && msg._id) {
    showMessage(msg, activeChat.type);
    lastMessageTime = msg.createdAt;
    scrollDown();
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function loadPendingCount() {
  const users = await api('GET', '/api/admin/pending');
  if (!Array.isArray(users)) return;
  var badge = document.getElementById('pendingBadge');
  if (users.length > 0) {
    badge.textContent = users.length;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

async function openAdmin() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('chatArea').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';
  clearInterval(pollInterval);

  const users = await api('GET', '/api/admin/pending');
  var list = document.getElementById('pendingList');
  list.innerHTML = '';

  if (!Array.isArray(users) || !users.length) {
    list.innerHTML = '<div class="no-pending">✅ No pending approvals</div>';
    return;
  }

  users.forEach(function (user) {
    var card = document.createElement('div');
    card.className = 'pending-card';
    card.id = 'pending_' + user._id;
    card.innerHTML =
      '<div class="pending-avatar" style="background:' + getColor(user.username) + '">' + initials(user.name || user.username) + '</div>' +
      '<div class="pending-info">' +
        '<strong>' + (user.name || user.username) + '</strong>' +
        '<span>' + user.email + '</span>' +
        '<span class="dept-tag">' + (user.department || 'General') + '</span>' +
      '</div>' +
      '<div class="pending-actions">' +
        '<button class="btn-approve" onclick="approveUser(\'' + user._id + '\')">✓ Approve</button>' +
        '<button class="btn-reject" onclick="rejectUser(\'' + user._id + '\')">✕ Reject</button>' +
      '</div>';
    list.appendChild(card);
  });
}

function closeAdmin() {
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('emptyState').style.display = 'flex';
}

async function approveUser(id) {
  await api('POST', '/api/admin/approve/' + id);
  document.getElementById('pending_' + id)?.remove();
  loadPendingCount();
  loadUsers();
}

async function rejectUser(id) {
  await api('DELETE', '/api/admin/reject/' + id);
  document.getElementById('pending_' + id)?.remove();
  loadPendingCount();
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

function showChatArea() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('chatArea').style.display = 'flex';
}

function toggleSection(id) {
  var list = document.getElementById(id === 'channels' ? 'channelsList' : 'dmsList');
  var chevron = document.getElementById('chevron-' + id);
  var hidden = list.style.display === 'none';
  list.style.display = hidden ? '' : 'none';
  chevron.style.transform = hidden ? '' : 'rotate(-90deg)';
}

function filterSidebar() { renderDMs(); }

function scrollDown() {
  var c = document.getElementById('messagesContainer');
  c.scrollTop = c.scrollHeight;
}

function logout() {
  clearInterval(pollInterval);
  clearInterval(userPollInterval);
  api('POST', '/api/auth/logout');
  localStorage.clear();
  window.location.href = '/';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatTime(dateStr) {
  var d = new Date(dateStr);
  var h = d.getHours(), m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}
