// feed.js — load global feed, handle new post composer

async function initComposer() {
  await refreshNavPromise;
  const composer = document.getElementById('composer');
  if (currentUser) composer.style.display = 'block';
}

async function loadFeed() {
  const feedEl = document.getElementById('feed');
  const posts = await api('/api/feed');
  feedEl.innerHTML = '';
  if (posts.length === 0) {
    feedEl.innerHTML = '<p class="empty-state">No posts yet. Be the first to share something!</p>';
    return;
  }
  posts.forEach((post) => feedEl.appendChild(renderPost(post)));
}

document.getElementById('post-btn').addEventListener('click', async () => {
  const textarea = document.getElementById('post-content');
  const content = textarea.value.trim();
  if (!content) return;
  try {
    await api('/api/posts', { method: 'POST', body: JSON.stringify({ content }) });
    textarea.value = '';
    loadFeed();
  } catch (err) {
    document.getElementById('message-area').innerHTML = `<div class="message error">${err.message}</div>`;
  }
});

// Ensure currentUser is populated (set by common.js refreshNav) before showing composer
const refreshNavPromise = refreshNav();
initComposer();
loadFeed();
