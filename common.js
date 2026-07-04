// common.js — shared helpers for every page

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr + 'Z')) / 1000);
  const units = [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]];
  for (const [label, secs] of units) {
    const val = Math.floor(seconds / secs);
    if (val >= 1) return `${val}${label} ago`;
  }
  return 'just now';
}

let currentUser = null;

async function refreshNav() {
  const { user } = await api('/api/me');
  currentUser = user;
  const authArea = document.getElementById('auth-area');
  if (!authArea) return;
  if (user) {
    authArea.innerHTML = `
      <a href="/profile.html?username=${user.username}">My Profile</a>
      <button id="logout-btn">Log out</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await api('/api/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  } else {
    authArea.innerHTML = `<a href="/login.html">Log in</a> <a href="/register.html">Register</a>`;
  }
}

document.addEventListener('DOMContentLoaded', refreshNav);
