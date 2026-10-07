# BVishal25.github.io — Personal Portfolio

Personal portfolio of **Vishal Baskar** — AI Engineer (Agentic Systems & Backend).
Static site: plain HTML + CSS + JS. No build step required.

## Deploy to GitHub Pages

1. Create a new public repository named exactly **`BVishal25.github.io`**
   (GitHub → New repository → name: `BVishal25.github.io`).
2. Upload these files to the repository root:
   - `index.html`
   - `style.css`
   - `script.js`
   (Drag & drop via "uploading an existing file", or clone the repo and push.)
3. Go to **Settings → Pages**, and under *Build and deployment* select
   **Deploy from a branch** → Branch: `main` → folder: `/ (root)` → Save.
4. Wait ~1 minute. Your site goes live at:

   **https://BVishal25.github.io**

### Update the site later
Just edit `index.html` / `style.css` / `script.js` and push — GitHub Pages
redeploys automatically on every push to `main`.

### Optional: custom domain (e.g. vishalbaskar.in)
1. Buy a domain, add DNS records: `A` → `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153` (and/or `CNAME` → `BVishal25.github.io`).
2. In the repo: **Settings → Pages → Custom domain** → enter your domain → Save.
3. Add a file named `CNAME` containing just the domain (e.g. `vishalbaskar.in`)
   at the repo root if you deploy from a branch.

## Local preview
Open `index.html` in a browser, or run:
```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```
