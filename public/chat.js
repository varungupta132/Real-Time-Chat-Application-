var token = localStorage.getItem('token');
var currentUser = JSON.parse(localStorage.getItem('user'));

if (!token || !currentUser) window.location.href = '/';

var selectedUser = null;
var allUsers = [];
var lastMessageTime = null;
var pollInterval = null;
var userPollInterval = null;

var COLORS = ['#6c63ff', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

function getColor(name) {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

// ── Init ──────────────────────────────────────────────────────────────────────

window.onload = function () {
  document.getElementById('myUsername').textContent = currentUser.username;
  document.getElementById('myAvatar').textContent = currentUser.username[0].toUpperCase();
  document.getElementById('myAvatar').style.background = getColor(currentUser.username);

  setOnlineStatus(true);
  loadUsers();

  // Refresh user list (online status) every 10s
  userPollInterval = setInterval(loadUsers, 10000);

  // Mark offline on tab close
  window.addEventListener('beforeunload', () => setOnlineStatus(false));
};

// ── API helpers ───────────────────────────────────────────────────────────────

function api(method, url, body) {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (res) {
    if (res.status === 401) logout();
    return res.json();
  });
}

function setOnlineStatus(isOnline) {
  api('POST', '/api/status', { isOnline });
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function loadUsers() {
  const users = await api('GET', '/api/users');
  if (!Array.isArray(users)) return;
  allUsers = users;
  renderUsers();
}

function renderUsers() {
  var search = document.getElementById('searchInput').value.toLowerCase();
  var list = document.getElementById('usersList');
  list.innerHTML = '';

  allUsers.forEach(function (user) {
    if (search && !user.username.toLowerCase().includes(search)) return;

    var li = document.createElement('li');
    li.className = 'user-item' + (selectedUser && selectedUser._id === user._id ? ' active' : '');
    li.onclick = function () { openChat(user); };
    li.innerHTML =
      '<div class="user-avatar" style="background:' + getColor(user.username) + '">' +
        user.username[0].toUpperCase() +
        '<span class="status-dot ' + (user.isOnline ? 'online' : 'offline') + '"></span>' +
      '</div>' +
      '<div class="user-details">' +
        '<span class="user-name">' + user.username + '</span>' +
        '<span class="user-last" id="preview_' + user._id + '">' +
          (user.isOnline ? 'Online' : 'Offline') +
        '</span>' +
      '</div>';
    list.appendChild(li);
  });
}

function filterUsers() { renderUsers(); }

// ── Chat ──────────────────────────────────────────────────────────────────────

async function openChat(user) {
  selectedUser = user;
  lastMessageTime = null;
  renderUsers();

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('chatArea').style.display = 'flex';
  document.getElementById('chatAvatar').textContent = user.username[0].toUpperCase();
  document.getElementById('chatAvatar').style.background = getColor(user.username);
  document.getElementById('chatUsername').textContent = user.username;
  document.getElementById('chatStatus').textContent = user.isOnline ? 'Online' : 'Offline';
  document.getElementById('messagesList').innerHTML = '';

  // Load history
  const messages = await api('GET', '/api/messages/' + user._id);
  if (Array.isArray(messages)) {
    messages.forEach(showMessage);
    if (messages.length) lastMessageTime = messages[messages.length - 1].createdAt;
    scrollDown();
  }

  document.getElementById('messageInput').focus();

  // Start polling for new messages every 2s
  clearInterval(pollInterval);
  pollInterval = setInterval(pollMessages, 2000);
}

async function pollMessages() {
  if (!selectedUser) return;
  var url = '/api/messages/' + selectedUser._id + '/poll';
  if (lastMessageTime) url += '?since=' + encodeURIComponent(lastMessageTime);

  const messages = await api('GET', url);
  if (!Array.isArray(messages) || !messages.length) return;

  messages.forEach(showMessage);
  lastMessageTime = messages[messages.length - 1].createdAt;
  scrollDown();

  // Update preview
  var last = messages[messages.length - 1];
  var otherId = last.sender._id === currentUser.id ? last.receiver._id : last.sender._id;
  updatePreview(otherId, last.content);
}

function showMessage(msg) {
  var senderId = msg.sender._id || msg.sender;
  var isMine = senderId === currentUser.id;

  var div = document.createElement('div');
  div.className = 'message-wrapper ' + (isMine ? 'sent' : 'received');
  div.innerHTML =
    '<div class="message-bubble">' + escapeHtml(msg.content) + '</div>' +
    '<span class="message-time">' + formatTime(msg.createdAt) + '</span>';
  document.getElementById('messagesList').appendChild(div);
}

async function sendMessage(e) {
  e.preventDefault();
  var input = document.getElementById('messageInput');
  var content = input.value.trim();
  if (!content || !selectedUser) return;

  input.value = '';
  const msg = await api('POST', '/api/messages', { receiverId: selectedUser._id, content });
  if (msg && msg._id) {
    showMessage(msg);
    lastMessageTime = msg.createdAt;
    updatePreview(selectedUser._id, msg.content);
    scrollDown();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function updatePreview(userId, content) {
  var el = document.getElementById('preview_' + userId);
  if (el) el.textContent = content.length > 25 ? content.slice(0, 25) + '...' : content;
}

function scrollDown() {
  var c = document.getElementById('messagesContainer');
  c.scrollTop = c.scrollHeight;
}

function logout() {
  clearInterval(pollInterval);
  clearInterval(userPollInterval);
  setOnlineStatus(false);
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
