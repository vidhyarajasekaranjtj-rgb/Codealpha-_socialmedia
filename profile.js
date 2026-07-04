// profile.js — user profile page: bio, follow/unfollow, their posts

const params = new URLSearchParams(window.location.search);
const username = params.get('username');

async function loadProfile() {
  await refreshNav();
  const headerEl = document.getElementById('profile-header');
  const postsEl = document.getElementById('profile-posts');

  if (!username) {
    headerEl.innerHTML = '<p class="empty-state">No user specified.</p>';
    return;
  }

  try {
    const { profile, posts } = await api(`/api/users/${username}`);

    headerEl.innerHTML = `
      <div class="profile-header">
        <img class="avatar" src="${profile.avatar_url}" alt="${profile.username}">
        <div>
          <h2 style="margin:0">${profile.username}</h2>
          <p style="margin:0.3rem 0; color:var(--muted)">${profile.bio || 'No bio yet.'}</p>
          <div class="profile-stats">
            <span><b>${profile.postCount}</b> posts</span>
            <span><b>${profile.followers}</b> followers</span>
            <span><b>${profile.following}</b> following</span>
          </div>
        </div>
        ${!profile.isSelf && currentUser ? `
          <button class="btn ${profile.isFollowing ? 'btn-outline' : ''}" id="follow-btn">
            ${profile.isFollowing ? 'Unfollow' : 'Follow'}
          </button>` : ''}
      </div>
    `;

    const followBtn = document.getElementById('follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        const result = await api(`/api/users/${username}/follow`, { method: 'POST' });
        followBtn.textContent = result.following ? 'Unfollow' : 'Follow';
        followBtn.classList.toggle('btn-outline', result.following);
      });
    }

    postsEl.innerHTML = '';
    if (posts.length === 0) {
      postsEl.innerHTML = '<p class="empty-state">No posts yet.</p>';
    } else {
      posts.forEach((post) => postsEl.appendChild(renderPost(post)));
    }
  } catch (err) {
    headerEl.innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}

loadProfile();
