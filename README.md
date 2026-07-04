# Mini Social Media Platform

A mini social media app built with **Express.js** (Node.js) and vanilla **HTML/CSS/JavaScript**, backed by a local **SQLite** database (`better-sqlite3`) — no external database server required.

## Features
- User registration & login (bcrypt-hashed passwords, session-based auth)
- User profiles with bio, avatar, and stats (posts / followers / following)
- Create, view, and delete posts
- Comment on posts
- Like / unlike posts
- Follow / unfollow other users

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (no framework, fetch-based API calls)
- **Backend:** Express.js
- **Database:** SQLite (`better-sqlite3`) — tables for `users`, `posts`, `comments`, `likes`, `follows`
- **Auth:** `express-session` + `bcryptjs`

## Project Structure
```
social-media-app/
├── server.js          # Express app & all API routes
├── db.js              # SQLite connection & schema
├── package.json
└── public/
    ├── index.html      # Global feed + post composer
    ├── login.html
    ├── register.html
    ├── profile.html    # User profile + their posts
    ├── css/style.css
    └── js/
        ├── common.js   # Shared nav/auth logic + fetch helper
        ├── posts.js    # Reusable post-card rendering (like/comment/delete)
        ├── feed.js
        └── profile.js
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

Then open **http://localhost:3001** in your browser. Register a couple of accounts in separate browser profiles (or incognito windows) to try out following, liking, and commenting between users.

## API Overview

| Method | Route                          | Description                          |
|--------|----------------------------------|----------------------------------------|
| POST   | `/api/register`                 | Create a new account                  |
| POST   | `/api/login`                     | Log in                                |
| POST   | `/api/logout`                    | Log out                               |
| GET    | `/api/me`                        | Get current session user              |
| GET    | `/api/feed`                      | Global feed (newest first)            |
| POST   | `/api/posts`                     | Create a post                         |
| DELETE | `/api/posts/:id`                 | Delete your own post                  |
| POST   | `/api/posts/:id/like`            | Like / unlike a post                  |
| GET    | `/api/posts/:id/comments`        | List comments on a post               |
| POST   | `/api/posts/:id/comments`        | Add a comment                         |
| GET    | `/api/users/:username`           | Get a user's profile + their posts    |
| POST   | `/api/users/:username/follow`    | Follow / unfollow a user              |
| PUT    | `/api/users/me`                  | Update your own bio                   |

## Notes
- The database file `social.db` is created automatically on first run and is git-ignored.
- Avatars are auto-generated via DiceBear based on username — no upload handling needed for this demo.
- Change `SESSION_SECRET` via an environment variable before deploying to production.
