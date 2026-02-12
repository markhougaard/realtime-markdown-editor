# Automated Deployment Guide - Hetzner Cloud

This guide covers the fully automated deployment setup for `your-domain.here` on Hetzner Cloud.

## Architecture

```
GitHub Push → GitHub Actions Tests → Build Docker Image → Push to GHCR
                                                          ↓
                                   SSH Deploy to Hetzner → docker-compose up
                                                          ↓
                                   Caddy (SSL + Reverse Proxy)
                                                          ↓
                                   Docker Container (Node.js App)
```

## Prerequisites

- Hetzner Cloud account
- GitHub repository (this one)
- Domain name with DNS management
- SSH key pair (generate locally if needed)

## Setup Instructions

### 1. Create Hetzner Cloud Server

1. Log in to [hetzner.cloud](https://hetzner.cloud)
2. Create a new project: "markdown-editor"
3. Create a new server:
   - **Image:** Ubuntu 22.04 LTS
   - **Type:** CX22 (2 vCPU, 4GB RAM, ~€4.99/month)
   - **Location:** Falkenstein, Germany (or your preferred EU location)
   - **SSH Key:** Add your public SSH key
   - Click "Create Server"

4. Note the server's **IP address** (e.g., `192.168.1.100`)

### 2. Initial Server Setup

```bash
# SSH into the server
ssh root@YOUR_HETZNER_IP

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/realtime-markdown-editor/main/scripts/setup-hetzner.sh -o setup.sh
chmod +x setup.sh

# Run setup (requires: GITHUB_REPO=YOUR_USERNAME/realtime-markdown-editor)
GITHUB_REPO=YOUR_USERNAME/realtime-markdown-editor ./setup.sh
```

The script will:
- ✅ Update system packages
- ✅ Install Docker & Docker Compose
- ✅ Clone your repository
- ✅ Set up Docker authentication
- ✅ Create configuration files
- ✅ Start containers

### 3. Configure GitHub Secrets

Your GitHub repository needs these secrets for automated deployment:

**Go to:** Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value | Example | Purpose |
|-------------|-------|---------|---------|
| `HETZNER_HOST` | Your server IP | `192.168.1.100` | SSH connection target |
| `HETZNER_USER` | SSH username | `root` | SSH connection user |
| `HETZNER_SSH_KEY` | Your SSH private key | (multiline PEM) | SSH authentication |
| `DOMAIN` | Your domain name | `your-domain.here` | **Used throughout deployment** |

**The `DOMAIN` secret is special** — it's automatically used by:
- ✅ GitHub Actions workflow (deployment)
- ✅ Server setup script (configuration)
- ✅ Docker Compose (container environment)
- ✅ Caddyfile (SSL certificate + reverse proxy)

This makes everything **domain-agnostic** — change one secret and it works for any domain!

**To get your SSH key:**
```bash
# On your local machine
cat ~/.ssh/id_rsa
```

**To create an SSH key if you don't have one:**
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
cat ~/.ssh/id_rsa  # Copy this for HETZNER_SSH_KEY secret
```

### 4. Update DNS Records

#### Option A: Use Hetzner DNS (Recommended)

1. In Hetzner Cloud console, create a new DNS zone
2. Add these records:
   - **Name:** `your-domain.here` | **Type:** NS | **Value:** `ns1.hetzner.com`
   - **Name:** `your-domain.here` | **Type:** NS | **Value:** `ns2.hetzner.com`
   - **Name:** `your-domain.here` | **Type:** NS | **Value:** `ns3.hetzner.com`
   - **Name:** `your-domain.here` | **Type:** A | **Value:** YOUR_HETZNER_IP

3. Update your domain registrar to use Hetzner nameservers

#### Option B: Keep Current Registrar

Add/update these records at your domain registrar:
- **Type:** A
- **Name:** `your-domain.here`
- **Value:** YOUR_HETZNER_IP
- **TTL:** 3600

### 5. Configure Caddy Email

On the Hetzner server, update Caddyfile email:

```bash
ssh root@YOUR_HETZNER_IP

# Edit docker-compose.yml
nano docker-compose.yml

# Update the DOMAIN variable if needed, then restart
DOMAIN=your-domain.here docker-compose down
DOMAIN=your-domain.here docker-compose up -d
```

## Automated Deployment

Once GitHub secrets are configured, deployment is **automatic**:

1. **Push code to `main` branch**
2. **GitHub Actions** automatically:
   - Runs all tests (unit + integration)
   - Builds Docker image
   - Pushes to GitHub Container Registry
   - SSHes into Hetzner server
   - Pulls latest image and restarts containers

**Monitor deployment:** Go to your GitHub repo → Actions tab

## Manual Deployment (Emergency)

If you need to deploy manually:

```bash
# SSH into server
ssh root@YOUR_HETZNER_IP

# Navigate to app directory
cd /root/markdown-editor

# Pull latest code
git pull origin main

# Rebuild and restart
DOMAIN=your-domain.here docker-compose down
docker image prune -f
docker pull ghcr.io/YOUR_USERNAME/realtime-markdown-editor:latest
DOMAIN=your-domain.here docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

## Monitoring & Maintenance

### Check Container Status
```bash
docker-compose ps
docker-compose logs -f app
docker-compose logs -f caddy
```

### View Database
```bash
docker-compose exec app ls -lh /app/data/
```

### Backup Database
```bash
docker-compose exec app cp /app/data/documents.db /app/data/documents.db.backup
docker cp markdown-editor:/app/data/documents.db ~/documents.db.backup
```

### Update Configuration
```bash
# Edit environment or Caddyfile
nano docker-compose.yml
nano Caddyfile

# Restart containers
docker-compose restart

# Or full restart
docker-compose down
docker-compose up -d
```

### View SSL Certificate Status
```bash
docker-compose exec caddy caddy list-modules
docker-compose logs caddy | grep certificate
```

### Scaling (Upgrade Server)

If you need more resources:
1. Create larger Hetzner server
2. Stop containers: `docker-compose down`
3. Copy data: `scp -r root@OLD_IP:/root/markdown-editor ./`
4. Update GitHub secrets with new IP
5. Run setup script on new server

## Security

### SSL/TLS
- ✅ Automatic Let's Encrypt via Caddy
- ✅ Auto-renewal before expiration
- ✅ HSTS header enabled

### Firewall
```bash
# On Hetzner server, enable UFW
ufw enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
```

### Docker Security
- ✅ Images signed & verified
- ✅ Read-only root filesystem (consider enabling)
- ✅ Health checks enabled
- ✅ Resource limits (configurable)

## Troubleshooting

### "Connection refused" on deploy
```bash
# Check SSH key and host
ssh -i ~/.ssh/id_rsa root@YOUR_HETZNER_IP
```

### Docker pull fails
```bash
# Verify Docker login
docker login ghcr.io
docker pull ghcr.io/YOUR_USERNAME/realtime-markdown-editor:latest
```

### App not accessible
```bash
# Check containers
docker-compose ps

# Check logs
docker-compose logs app
docker-compose logs caddy

# Check port binding
netstat -tlnp | grep 3000
```

### Certificate renewal fails
```bash
# Check Caddy logs
docker-compose logs caddy | tail -50

# Force renewal
docker-compose restart caddy
```

## Cost Estimate

- **CX22 Server:** €4.99/month
- **Bandwidth:** Free (within EU)
- **Domain:** ~€10-15/year (external registrar)
- **SSL:** Free (Let's Encrypt via Caddy)
- **Total:** ~€5-6/month

## Next Steps

1. ✅ Create Hetzner server
2. ✅ Run setup script
3. ✅ Add GitHub secrets
4. ✅ Update DNS records
5. ✅ Push code to trigger deployment
6. ✅ Access `https://your-domain.here`

## Support

For issues, check:
- GitHub Actions logs (Actions tab)
- Server logs: `docker-compose logs`
- Hetzner console for server status
