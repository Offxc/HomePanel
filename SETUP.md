# HomePanel — full setup from scratch

A from-zero walkthrough to deploy **HomePanel** to your own domain (this guide uses **`https://home.example.com`** as a placeholder) on a Docker VM. Assumes you've never deployed a web app before. **Read each step in full before running it.**

**Estimated time:** 30–40 minutes start to finish.

**You'll need open in different windows / tabs:**
- A PowerShell window on your **Windows** machine
- An SSH terminal connected to the **VM** (or the VM's console)
- A browser tab for **Discord** (https://discord.com/developers/applications)
- A browser tab for your **DNS provider** (e.g. Namecheap, Cloudflare)
- A browser tab for **GitHub** (https://github.com)
- A scratch **Notepad** window — you'll be collecting a handful of values to paste later

> **Conventions in this guide:**
> - `🪟 PowerShell` blocks run on your Windows machine
> - `🐧 VM` blocks run on the Ubuntu VM (in the SSH session)
> - `🌐 Browser` blocks are clicks/forms in a web UI
> - Anything in `<angle brackets>` is a placeholder — replace with your real value before running. That includes `<your-domain>`, `<user>@<vm-host>`, and `<your-github-username>`.

---

## Step 0 — Things you should know before you start

1. **80 + 443 must reach the VM from the internet.** If your VM already serves other containers (for example a management UI on another port), ports 80 and 443 need that same path from the internet. If you're not sure these are forwarded, you'll find out at Step 10 when the cert provisions (or doesn't). Step 11 in Troubleshooting covers fixing it.
2. **You'll need two Discord User IDs** — yours and the second person's. The second person does their Discord steps once and sends you their ID.
3. **The `.env` file is sensitive** — it holds your Discord secret and the session signing key. Never commit it to GitHub. `.env.example` (which is committed) is just the template.

---

## Step 1 — SSH into the VM 🪟

From your Windows machine, connect to the VM (replace `<user>` and `<vm-host>` with your VM's login and hostname or IP):

```powershell
# 🪟 PowerShell
ssh <user>@<vm-host>
```

If the hostname doesn't resolve, use the VM's IP instead (you can see it from the VM's console with `hostname -I`).

Enter your VM password when prompted. You're now in.

---

## Step 2 — Install the small tools you'll need 🐧

This guide assumes Docker is already installed on the VM. A few utilities aren't always installed:

```bash
# 🐧 VM
sudo apt update
sudo apt install -y git nano curl dnsutils
```

`git` clones the code. `nano` is a beginner-friendly text editor. `curl` checks things over HTTP. `dnsutils` gives us `dig` for verifying DNS later.

Verify Docker is healthy (won't ask for sudo if your user is in the `docker` group):

```bash
# 🐧 VM
docker ps
```

You should see a list of currently running containers. If you get a permission error, run `sudo usermod -aG docker $USER`, then `exit` + SSH back in.

---

## Step 3 — Create the Discord application 🌐

This is what HomePanel uses for sign-in. Five minutes, exact clicks:

1. Go to https://discord.com/developers/applications and sign in if it prompts you.
2. **Top right** → click **New Application**.
3. **Name** field → type `HomePanel`. Tick the terms checkbox. Click **Create**.
4. You're now on the app's main page. **Left sidebar** → click **OAuth2**.
5. Scroll down to the **Redirects** section.
6. Click **Add Redirect**. A box appears. Paste exactly (using your real domain):
   ```
   https://home.example.com/api/auth/callback/discord
   ```
7. Click **Add Redirect** again. In the new box, paste:
   ```
   http://localhost:3000/api/auth/callback/discord
   ```
   (That second one is so you can test changes locally on Windows in the future.)
8. Scroll to the **bottom of the page**. A green bar reads "You have unsaved changes" — click **Save Changes**.

Now grab your two values:

9. Scroll back up. The **Client information** section shows **Client ID** — a long number. Click **Copy** next to it. **Paste into Notepad and label it `AUTH_DISCORD_ID`.**
10. Just below it, click **Reset Secret**. Confirm in the popup. A new secret appears — *you can only view it once*. Click **Copy**, **paste into Notepad and label it `AUTH_DISCORD_SECRET`**.

✅ At this point Notepad should have two entries.

---

## Step 4 — Get both Discord User IDs 🌐

These are different from the Client ID. They identify the *people* who are allowed to sign in.

### 4.1 Enable Developer Mode (do this on your Discord; ask the second person to do it on theirs)

1. Open Discord (desktop app or web).
2. Click the **gear icon** at the very bottom-left (next to your username) — opens **User Settings**.
3. Scroll the left sidebar to **App Settings → Advanced**.
4. Toggle **Developer Mode** to **ON**.
5. Close Settings (Esc, or the X).

### 4.2 Copy your own User ID

1. In Discord, in any channel or your DMs, **right-click your own username**.
2. At the bottom of the menu: **Copy User ID**.
3. **Paste into Notepad and label it `YOUR_DISCORD_ID`.** It's a long number.

### 4.3 Get the second person's User ID

The second person does steps 4.1 and 4.2 on their Discord, then sends you the ID. **Paste into Notepad and label it `PARTNER_DISCORD_ID`.**

✅ Notepad should now have **four** entries: `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `YOUR_DISCORD_ID`, `PARTNER_DISCORD_ID`.

---

## Step 5 — Find your public IP and set up DNS 🌐

### 5.1 Find your public IP

On the VM:

```bash
# 🐧 VM
curl -s ifconfig.me
echo
```

You'll see something like `203.0.113.42`. That's the public IP your domain will point at. **Write it down.**

### 5.2 Add the A record at your DNS provider

In your DNS provider's dashboard, open the DNS settings for your domain and add a record:

| Field | Value |
|---|---|
| **Type** | `A` |
| **Host / Name** | `home` (the subdomain — gives you `home.example.com`) |
| **Value** | The IP from step 5.1 |
| **TTL** | `5 min` (or Automatic) |

Save the record.

### 5.3 Verify DNS propagated

Back on the VM, after ~2 minutes:

```bash
# 🐧 VM
dig home.example.com +short
```

You should see your IP printed. If it's empty, wait another minute and try again. If after 5 minutes it's still empty, double-check the record type is **A** (not "URL Redirect" or "CNAME").

---

## Step 6 — Push the code to GitHub 🪟

The code is on your Windows machine (e.g. `C:\path\to\HomePanel`). You'll push it to a new **private** GitHub repo.

### 6.1 Create the GitHub repo

1. Open https://github.com/new
2. Sign in if prompted.
3. **Repository name**: `HomePanel`
4. **Description**: leave blank or "Self-hosted shared household dashboard"
5. Set it to **Private**.
6. **Don't tick** "Add a README" — your project already has one.
7. **Don't tick** "Add .gitignore" or any license.
8. Click **Create repository**.

The next page shows setup commands — ignore them. You'll use the ones below.

### 6.2 Create a Personal Access Token (PAT)

GitHub no longer accepts passwords from the command line. You need a PAT:

1. Open https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**.
3. **Note**: `HomePanel push`
4. **Expiration**: 90 days (or whatever)
5. Under **Select scopes**, tick the top-level **repo** box (it auto-ticks the sub-boxes).
6. Scroll to the bottom → **Generate token**.
7. Copy the token that appears — **you can only see it once**. **Paste into Notepad, label it `GITHUB_PAT`.**

### 6.3 Push the code

```powershell
# 🪟 PowerShell — replace <your-github-username> and the project path
cd "C:\path\to\HomePanel"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-github-username>/HomePanel.git
git push -u origin main
```

When prompted:
- **Username**: your GitHub username
- **Password**: paste the **PAT** from step 6.2 (not your GitHub password)

If it errors with "remote contains work that you do not have locally", run:
```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

✅ Refresh your repo page on GitHub — you should see all the project files.

---

## Step 7 — Clone the code onto the VM 🐧

```bash
# 🐧 VM — replace <your-github-username>
cd ~
git clone https://github.com/<your-github-username>/HomePanel.git
cd HomePanel
```

When git prompts:
- **Username**: your GitHub username
- **Password**: the PAT from step 6.2 again

You should now be in `~/HomePanel` and `ls` should show files like `README.md`, `docker-compose.yml`, `Caddyfile`, `package.json`, etc.

---

## Step 8 — Configure `.env` 🐧

This file holds your secrets. Create it from the example, then fill it in:

```bash
# 🐧 VM
cp .env.example .env
nano .env
```

`nano` opens. **Use arrow keys to move**, type to edit. Set **every line**:

| Variable | What to paste |
|---|---|
| `AUTH_SECRET` | **In a different SSH window**, run `openssl rand -base64 32`. Copy the entire output. Paste here. |
| `AUTH_URL` | `https://home.example.com` (your real domain) |
| `AUTH_TRUST_HOST` | `true` *(already correct, leave it)* |
| `AUTH_DISCORD_ID` | The `AUTH_DISCORD_ID` from Notepad (Step 3) |
| `AUTH_DISCORD_SECRET` | The `AUTH_DISCORD_SECRET` from Notepad (Step 3) |
| `ALLOWED_DISCORD_IDS` | `<YOUR_DISCORD_ID>,<PARTNER_DISCORD_ID>` — comma, **no spaces**. Example: `123456789012345678,987654321098765432` |
| `DISPLAY_NAMES` | `<YOUR_DISCORD_ID>:YourName,<PARTNER_DISCORD_ID>:PartnerName` — comma, no spaces |
| `APP_PUBLIC_URL` | `home.example.com` (your domain, no `https://`) — shown in the bot's embed footer |
| `DATABASE_URL` | `file:./data/homepanel.db` *(already correct, leave it)* |

> **Tip for the AUTH_SECRET window:** open a second PowerShell, then a second `ssh <user>@<vm-host>` connection. Run `openssl rand -base64 32` there. Highlight the output with your mouse, right-click to copy. Switch back to the nano window, right-click to paste. Don't type the secret by hand — too easy to fat-finger.

Save and exit nano:
1. **Ctrl + O** (write the file)
2. **Enter** (confirm filename)
3. **Ctrl + X** (exit)

Verify it looks right:

```bash
# 🐧 VM
cat .env
```

There should be no empty `=` lines. Every line should have a real value.

---

## Step 9 — Set the Caddy email 🐧

Caddy is HomePanel's built-in HTTPS gateway. It needs an email so Let's Encrypt can warn you if a cert is about to expire (and to comply with their ToS):

```bash
# 🐧 VM
nano Caddyfile
```

Set the domain and email placeholders to your real values:
```
{
    email you@example.com
}

home.example.com {
    ...
}
```
Use a real email you read, and your real domain. Save with **Ctrl+O**, **Enter**, **Ctrl+X**.

---

## Step 10 — Build and start the app 🐧

```bash
# 🐧 VM
docker compose up -d --build
```

This will:
1. Download the Node.js base image (~30 sec, one time)
2. Build the HomePanel image (~3–5 min, one time)
3. Start the containers:
   - `app` — the Next.js app on internal port 3000
   - `caddy` — the reverse proxy on ports 80 + 443
   - `bot` — the Discord daily-digest bot

When the prompt comes back, watch the logs:

```bash
# 🐧 VM
docker compose logs -f
```

You're waiting for:
- `homepanel-app-1   | ✓ Ready in XXXms`
- `homepanel-caddy-1 | ... serving initial configuration`

Once both show up, press **Ctrl+C** to stop watching (the containers keep running in the background).

### Sanity-check it locally first

```bash
# 🐧 VM
curl -I http://localhost
# Expect: HTTP/1.1 308 Permanent Redirect — Caddy redirecting to HTTPS

curl -kI https://localhost
# Expect: HTTP/2 200
```

(`-k` skips the cert check because Caddy hasn't been asked for a public cert yet — that happens on the first real request to your domain.)

---

## Step 11 — Sign in 🌐

1. Open `https://home.example.com` (your real domain) in any browser.
2. **The first request takes 10–30 seconds** — Caddy is fetching a Let's Encrypt certificate behind the scenes. If you get a "cert error" page, hit **refresh** in 30 seconds.
3. You should see the HomePanel sign-in screen with a **Discord button**.
4. Click **Continue with Discord**.
5. Discord asks you to authorise → **Authorize**.
6. You land on `/today`. The page is mostly empty because there's no data yet — that's fine.
7. Click the **settings gear** in the top-right of the header.
8. Edit your display name if you want, pick a colour for your pill, click **Save profile**.
9. Send the second person the URL. They sign in with their Discord and personalise their settings the same way.

You're live. 🎉

---

# Troubleshooting

## "Your connection is not private" / cert error that doesn't go away

Caddy can't reach Let's Encrypt or Let's Encrypt can't reach Caddy. Things to check:

```bash
# 🐧 VM
# 1. Is Caddy running and listening on 80/443?
docker compose ps
sudo ss -tlnp 'sport = :80 or sport = :443'
# You should see docker-proxy on 80 + 443 now.

# 2. Is the DNS pointing correctly?
dig home.example.com +short
# Should print your public IP.

# 3. Are ports 80/443 reachable from the internet?
# Open https://www.canyouseeme.org on your phone (on cellular, not Wi-Fi)
# Enter port 80, click "Check Port". Then 443. Both must say SUCCESS.
```

If `canyouseeme.org` says "Connection refused" or "timed out" on 80 or 443, your **router** isn't forwarding those ports to the VM. Open your router admin page (typically `http://192.168.1.1`), find "Port Forwarding", and add rules forwarding TCP 80 and TCP 443 to the VM's LAN IP. If the VM is NAT'd inside a hypervisor, forward to that NAT address (and add host-level port-proxy rules if required).

## "Your Discord account isn't on the allow-list"

Your Discord User ID isn't matching what's in `.env`.

```bash
# 🐧 VM
cd ~/HomePanel
cat .env | grep ALLOWED
```

The IDs must be **exact**, comma-separated, no spaces. Edit if needed:
```bash
nano .env
docker compose restart app
```

## "Failed to find Server Action" / weird 500s on a form

Browser cached an old session. **Hard refresh** (Ctrl+Shift+R), or sign out + back in.

## App won't even start

```bash
# 🐧 VM
cd ~/HomePanel
docker compose logs --tail=80 app
```

Look at the first red line — that's the root cause. Common ones:
- `Environment variable not found: DATABASE_URL` → `.env` is missing or unreadable. Re-run Step 8.
- `Cannot find module` → build cache is stale. `docker compose down && docker compose up -d --build`.
- `Error: Cannot bind 0.0.0.0:80` → something else now owns 80. Check `sudo ss -tlnp`.

## Reset everything (DESTRUCTIVE — permanently deletes all data)

⚠️ **This cannot be undone.** Only do this if you want to start completely fresh with an empty database.

```bash
# 🐧 VM
cd ~/HomePanel
docker compose down -v          # -v removes the homepanel_data named volume
docker compose up -d --build
```

---

# Day-to-day commands

```bash
# 🐧 VM — all of these run from ~/HomePanel

cd ~/HomePanel

# Live logs (Ctrl+C to detach)
docker compose logs -f

# Restart the app (e.g. after editing .env)
docker compose restart app

# Restart Caddy (e.g. after editing Caddyfile)
docker compose restart caddy

# Stop everything
docker compose down

# Update from GitHub and rebuild
git pull
docker compose up -d --build

# Back up the database (copies out of the named Docker volume)
docker run --rm -v homepanel_data:/data -v ~/:/backup alpine \
  cp /data/homepanel.db /backup/homepanel-backup-$(date +%F).db

# See which containers are running
docker compose ps
```

# Automated nightly backups (optional)

If you want a backup every night at 3 AM:

```bash
# 🐧 VM
sudo apt install -y sqlite3
sudo install -d -m 700 /etc/homepanel
sudo sh -c 'openssl rand -base64 32 > /etc/homepanel/backup.pass'
sudo chmod 600 /etc/homepanel/backup.pass

chmod +x ~/HomePanel/scripts/backup.sh

# Add to root's crontab
sudo crontab -e
# Add this line at the bottom (replace <user> with your VM username):
0 3 * * * /home/<user>/HomePanel/scripts/backup.sh >> /var/log/homepanel-backup.log 2>&1
```

The script copies `data/homepanel.db` into `data/backups/` every night and prunes anything older than 30 days. If you also want them encrypted off-site, add `rclone` and point it at S3-compatible storage.

---

# What gets committed and what doesn't

| File | In GitHub? |
|---|---|
| `.env` (your secrets) | **No** — gitignored |
| `.env.example` (template) | Yes |
| `data/homepanel.db` (the database) | **No** — gitignored |
| `node_modules/` | **No** — `docker compose build` recreates it |
| `Caddyfile` | Yes — but only after you've set your real domain + email |

Double-check before pushing future updates:
```bash
git status
# .env should NOT appear in the list
```
