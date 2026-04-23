var token = localStorage.getItem('token');
var currentUser = JSON.parse(localStorage.getItem('user'));

if (!token || !currentUser) {
  window.location.href = '/';
}

var socket;
var selectedUser = null;
var allUsers = [];
var typingTimer = null;

var COLORS = ['#6c63ff', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

function getColor(name) {
  var i = name.charCodeAt(0) % COLORS.length;
  return COLORS[i];
}

window.onload = function() {
  document.getElementById('myUsername').textContent = currentUser.username;
  document.getElementById('myAvatar').textContent = currentUser.username[0].toUpperCase();
  document.getElementById('myAvatar').style.background = getColor(currentUser.username);

  loadUsers();
  connectSocket();
};

function connectSocket() {
  socket = io({ auth: { token: token }, transports: ['polling', 'websocket'] });

  socket.on('connect_error', function(err) {
    if (err.message === 'Invalid token' || err.message === 'No token') {
      logout();
    }
  });

  socket.on('new_message', function(msg) {
    var senderId = msg.sender._id;
    var receiverId = msg.receiver._id;

    if (selectedUser) {
      var isMyMessage = senderId === currentUser.id;
      var otherPersonId = isMyMessage ? receiverId : senderId;

      if (otherPersonId === selectedUser._id) {
        showMessage(msg);
        scrollDown();
      }
    }

    var otherId = senderId === currentUser.id ? receiverId : senderId;
    updatePreview(otherId, msg.content);
  });

  socket.on('typing', function(data) {
    if (selectedUser && data.senderId === selectedUser._id) {
      var el = document.getElementById('typingIndicator');
      if (data.isTyping) {
        el.textContent = selectedUser.username + ' is typing...';
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    }
  });

  socket.on('user_online', function(data) {
    updateUserStatus(data.userId, true);
  });

  socket.on('user_offline', function(data) {
    updateUserStatus(data.userId, false);
  });
}

async function loadUsers() {
  var res = await fetch('/api/users', {
    headers: { Authorization: 'Bearer ' + token }
  });

  if (res.status === 401) {
    logout();
    return;
  }

  allUsers = await res.json();
  renderUsers();
}

function renderUsers() {
  var search = document.getElementById('searchInput').value.toLowerCase();
  var list = document.getElementById('usersList');
  list.innerHTML = '';

  allUsers.forEach(function(user) {
    if (search && !user.username.toLowerCase().includes(search)) return;

    var li = document.createElement('li');
    li.className = 'user-item' + (selectedUser && selectedUser._id === user._id ? ' active' : '');
    li.onclick = function() { openChat(user); };

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

async function openChat(user) {
  selectedUser = user;
  renderUsers();

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('chatArea').style.display = 'flex';

  document.getElementById('chatAvatar').textContent = user.username[0].toUpperCase();
  document.getElementById('chatAvatar').style.background = getColor(user.username);
  document.getElementById('chatUsername').textContent = user.username;
  document.getElementById('chatStatus').textContent = user.isOnline ? 'Online' : 'Offline';

  document.getElementById('messagesList').innerHTML = '';

  var res = await fetch('/api/messages/' + user._id, {
    headers: { Authorization: 'Bearer ' + token }
  });
  var messages = await res.json();
  messages.forEach(function(msg) { showMessage(msg); });
  scrollDown();

  document.getElementById('messageInput').focus();
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

function sendMessage(e) {
  e.preventDefault();
  var input = document.getElementById('messageInput');
  var content = input.value.trim();

  if (!content || !selectedUser) return;

  socket.emit('send_message', {
    receiverId: selectedUser._id,
    content: content
  });

  input.value = '';
  stopTyping();
}

function handleTyping() {
  if (!selectedUser) return;

  socket.emit('typing', { receiverId: selectedUser._id, isTyping: true });

  clearTimeout(typingTimer);
  typingTimer = setTimeout(function() {
    stopTyping();
  }, 1500);
}

function stopTyping() {
  if (!selectedUser) return;
  socket.emit('typing', { receiverId: selectedUser._id, isTyping: false });
  clearTimeout(typingTimer);
}

function filterUsers() {
  renderUsers();
}

function updateUserStatus(userId, isOnline) {
  var user = allUsers.find(function(u) { return u._id === userId; });
  if (user) {
    user.isOnline = isOnline;
    renderUsers();
  }

  if (selectedUser && selectedUser._id === userId) {
    selectedUser.isOnline = isOnline;
    document.getElementById('chatStatus').textContent = isOnline ? 'Online' : 'Offline';
  }
}

function updatePreview(userId, content) {
  var el = document.getElementById('preview_' + userId);
  if (el) {
    el.textContent = content.length > 25 ? content.slice(0, 25) + '...' : content;
  }
}

function scrollDown() {
  var container = document.getElementById('messagesContainer');
  container.scrollTop = container.scrollHeight;
}

function logout() {
  if (socket) socket.disconnect();
  localStorage.clear();
  window.location.href = '/';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatTime(dateStr) {
  var d = new Date(dateStr);
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}
