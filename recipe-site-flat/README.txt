THE RECIPE BOX — admin-controlled, shared recipe site
========================================================

WHAT CHANGED
  This is now a small full website with a real backend, not just a
  static page. That's the only way for every visitor to see the exact
  same recipes: the recipes live in a file on the SERVER
  (data/recipes.json), not in any visitor's browser.

  - Everyone who opens the link sees the same recipes and can search
    them by name or ingredient.
  - Only the admin can add, edit, delete, import, or export recipes.
  - Admin login: click "Admin" in the top-right corner.
      username: anja
      password: 12345678
    (You can change these in server.js — look for ADMIN_USERNAME and
    ADMIN_PASSWORD near the top of the file.)

FOLDER CONTENTS (everything in one folder)
  server.js          the backend (Node.js + Express)
  package.json        lists the one dependency (express)
  recipes.json        the shared database — every recipe lives here
  index.html          the website
  styles.css          styling
  script.js           frontend logic

  Note: server.js automatically blocks direct web access to server.js,
  package.json, recipes.json, and README.txt, so even though they sit in
  the same folder as the website files, visitors can only reach them
  through the app itself (never as raw downloadable files).

HOW TO RUN IT LOCALLY (to try it out first)
  1. Install Node.js (18 or newer) if you don't already have it:
     https://nodejs.org
  2. Open a terminal in this folder and run:
       npm install
       npm start
  3. Open http://localhost:3000 in your browser.

HOW TO PUT IT ON A REAL SITE (so anyone with the link can use it)
  Because this has a backend, it needs a host that can run a Node.js
  server — not a purely static host like GitHub Pages. Good, easy,
  and free-tier-friendly options:

  - Render.com        (recommended — simplest for this kind of app)
  - Railway.app
  - Fly.io
  - A regular VPS (DigitalOcean, Linode, etc.) if you want full control

  General steps (Render, as an example):
  1. Push this folder to a GitHub repository.
  2. On Render: "New +" → "Web Service" → connect your repo.
  3. Build command:  npm install
     Start command:  npm start
  4. Deploy. Render gives you a public URL — that's the link you share.

  IMPORTANT — persistent storage:
  Some hosts (especially serverless ones like Vercel or Netlify
  functions) wipe the filesystem on every deploy or restart, which
  would erase data/recipes.json. Render, Railway, Fly.io, and a plain
  VPS all keep a normal persistent disk by default, so recipes will
  stick around. If you ever move to a serverless host, ask and this
  can be adapted to use a proper database (e.g. Supabase or Firebase)
  instead of a JSON file.

SECURITY NOTE
  The admin password is stored in plain text in server.js for
  simplicity. That's fine for a small personal/family site, but if
  this ever holds anything sensitive, consider hashing the password
  and using HTTPS (most hosts above give you HTTPS automatically).

BACKING UP YOUR RECIPES
  While signed in as admin, use "Export to file" any time to download
  a recipes.json snapshot, and "Import from file" to restore or bulk-
  replace recipes from a backup.
