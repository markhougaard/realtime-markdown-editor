# Quick Start: Deploy to Hetzner in 5 Minutes

## Step 1: Create Hetzner Server (2 min)

1. Go to [hetzner.cloud](https://hetzner.cloud)
2. Create server:
   - **Image:** Ubuntu 22.04 LTS
   - **Type:** CX22 (~€5/month)
   - **Location:** Falkenstein, Germany
   - **Add SSH key** (your public key)
3. Note the **IP address**

## Step 2: Run Setup Script (1 min)

```bash
# SSH into your new server
ssh root@YOUR_IP

# Run setup script
curl -fsSL https://raw.githubusercontent.com/markhougaard/realtime-markdown-editor/main/scripts/setup-hetzner.sh -o setup.sh
chmod +x setup.sh
GITHUB_REPO=markhougaard/realtime-markdown-editor ./setup.sh
```

Follow prompts to enter:
- GitHub username & token
- Your domain (e.g., `your-domain.here`)
- Email for SSL certificates

## Step 3: GitHub Secrets (1 min)

Go to your repo → **Settings → Secrets and variables → Actions**

Create these secrets (substitute your actual values):

| Name | Value |
|------|-------|
| `HETZNER_HOST` | Your server IP (e.g., `192.168.1.100`) |
| `HETZNER_USER` | `root` |
| `HETZNER_SSH_KEY` | Your SSH private key (multiline) |
| `DOMAIN` | Your domain (e.g., `your-domain.here`) |

**The `DOMAIN` secret is used automatically by all scripts and workflows!**

## Step 4: Update DNS (1 min)

Add/update A record at your registrar:
- **Name:** `your-domain.here`
- **Value:** YOUR_IP
- **TTL:** 3600

Wait 5-30 minutes for DNS to propagate.

## Step 5: Deploy (Auto)

```bash
# Just push to main!
git push origin main
```

GitHub Actions will:
- Run all tests
- Build Docker image
- Deploy to Hetzner
- Start containers
- Enable SSL

**Done!** 🎉

Visit `https://your-domain.here` in 2-3 minutes.

---

## Verify Deployment

```bash
# SSH into server
ssh root@YOUR_IP

# Check containers
docker-compose ps

# View logs
docker-compose logs -f

# Check health
curl https://your-domain.here
```

## Next Deployments

Just push to `main` — everything is automated!

```bash
git add .
git commit -m "your changes"
git push origin main
```

Watch deployment: GitHub → Actions tab

---

## Troubleshooting

**DNS not working?**
- Wait 10-30 minutes for propagation
- Check DNS at: https://dnschecker.org

**Deploy failed?**
- Check GitHub Actions logs
- SSH to server: `docker-compose logs app`

**App not responding?**
- Wait 30s for startup
- Check: `docker-compose ps`

---

For detailed setup, see [DEPLOYMENT.md](./DEPLOYMENT.md)
