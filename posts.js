// posts.js — render a post card with like/comment/delete interactions.
// Shared by index.html (feed) and profile.html.

function renderPost(post) {
  const wrapper = document.createElement('div');
  wrapper.className = 'post-card';
  wrapper.dataset.postId = post.id;
  wrapper.innerHTML = `
    <div class="post-header">
      <img class="avatar" src="${post.author.avatar_url}" alt="${post.author.username}">
      <div>
        <div class="post-author"><a href="/profile.html?username=${post.author.username}">${post.author.username}</a></div>
        <div class="post-time">${timeAgo(post.created_at)}</div>
      </div>
    </div>
    <div class="post-content"></div>
    <div class="post-actions">
      <button class="like-btn ${post.likedByMe ? 'liked' : ''}">❤ <span class="like-count">${post.likeCount}</span></button>
      <button class="comment-toggle">💬 <span class="comment-count">${post.commentCount}</span></button>
      ${currentUser && currentUser.id === post.author.id ? '<button class="delete-btn">🗑 Delete</button>' : ''}
    </div>
    <div class="comments-section" style="display:none">
      <div class="comment-list"></div>
      ${currentUser ? `
        <div class="comment-form">
          <input type="text" placeholder="Write a comment...">
          <button class="btn post-comment-btn">Post</button>
        </div>` : '<p class="post-time">Log in to comment.</p>'}
    </div>
  `;

  // Content is set via textContent to avoid any HTML injection from user posts.
  wrapper.querySelector('.post-content').textContent = post.content;

  // Like
  wrapper.querySelector('.like-btn').addEventListener('click', async (e) => {
    if (!currentUser) return (window.location.href = '/login.html');
    const result = await api(`/api/posts/${post.id}/like`, { method: 'POST' });
    const btn = e.currentTarget;
    btn.classList.toggle('liked', result.liked);
    btn.querySelector('.like-count').textContent = result.likeCount;
  });

  // Toggle comments
  const commentsSection = wrapper.querySelector('.comments-section');
  wrapper.querySelector('.comment-toggle').addEventListener('click', async () => {
    const isHidden = commentsSection.style.display === 'none';
    commentsSection.style.display = isHidden ? 'block' : 'none';
    if (isHidden) await loadComments(post.id, wrapper);
  });

  // Post comment
  const commentBtn = wrapper.querySelector('.post-comment-btn');
  if (commentBtn) {
    commentBtn.addEventListener('click', async () => {
      const input = wrapper.querySelector('.comment-form input');
      if (!input.value.trim()) return;
      await api(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: input.value.trim() })
      });
      input.value = '';
      await loadComments(post.id, wrapper);
      const countEl = wrapper.querySelector('.comment-count');
      countEl.textContent = Number(countEl.textContent) + 1;
    });
  }

  // Delete
  const deleteBtn = wrapper.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return;
      await api(`/api/posts/${post.id}`, { method: 'DELETE' });
      wrapper.remove();
    });
  }

  return wrapper;
}

async function loadComments(postId, wrapper) {
  const list = wrapper.querySelector('.comment-list');
  const comments = await api(`/api/posts/${postId}/comments`);
  list.innerHTML = comments.map((c) => `
    <div class="comment">
      <img class="avatar-sm" src="${c.avatar_url}" alt="${c.username}">
      <div><b>${c.username}</b>${escapeHtml(c.content)}</div>
    </div>
  `).join('') || '<p class="post-time">No comments yet.</p>';
}

// Minimal escaping since comment content is inserted via innerHTML above.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
