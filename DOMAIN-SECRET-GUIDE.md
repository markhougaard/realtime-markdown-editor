# Using the DOMAIN GitHub Secret

Your deployment is now completely **domain-agnostic**! This means you can deploy to any domain by simply setting one GitHub secret.

## What is the DOMAIN Secret?

The `DOMAIN` secret is a GitHub repository secret that contains your domain name (e.g., `your-domain.here`).

Once set, it automatically flows through your entire deployment pipeline:

```
GitHub Secret: DOMAIN = "your-domain.here"
         ↓
    GitHub Actions Workflow
         ↓
    Passes to SSH Deploy
         ↓
    Environment Variable in Docker
         ↓
    Used by:
    • Caddyfile (SSL certificate & reverse proxy)
    • docker-compose.yml (container configuration)
    • Deployment verification
```

## How to Set It Up

### Step 1: Add the DOMAIN Secret

1. Go to your GitHub repository
2. **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. Name: `DOMAIN`
5. Value: `your-domain.here` (your actual domain)
6. Click **"Add secret"**

### Step 2: That's It!

The secret is now automatically used by:
- ✅ `.github/workflows/deploy.yml` — Passes to deployment script
- ✅ `scripts/setup-hetzner.sh` — Uses during server setup
- ✅ `docker-compose.yml` — Sets in container environment
- ✅ `Caddyfile` — Uses for SSL certificates and proxying

## How It Works in Different Places

### In GitHub Actions Workflow

```yaml
env:
  DOMAIN: ${{ secrets.DOMAIN }}
```

The workflow passes `DOMAIN` to the deployment script running on your Hetzner server.

### In the Setup Script

```bash
# If DOMAIN is not passed as environment variable, script prompts for it
if [ -z "$DOMAIN" ]; then
  read -p "Enter your domain: " DOMAIN
fi

# Then uses it to configure containers
DOMAIN=${DOMAIN} docker-compose up -d
```

### In docker-compose.yml

```yaml
environment:
  DOMAIN: ${DOMAIN:-localhost}
```

The container receives `DOMAIN` as an environment variable. If not set, it defaults to `localhost` for local testing.

### In Caddyfile

```
{$DOMAIN:localhost} {
  # Reverse proxy to app
  reverse_proxy app:3000 {
    # WebSocket support...
  }
  # Security headers...
}
```

Caddy uses the `DOMAIN` variable to:
- Issue SSL certificate for your domain
- Configure the reverse proxy
- Set up HTTPS

## Changing Your Domain

If you need to deploy to a different domain:

1. Update the `DOMAIN` secret in GitHub:
   - Settings → Secrets → Update `DOMAIN`
   - Enter new domain value

2. Push a change to trigger deployment:
   ```bash
   git push origin main
   ```

3. GitHub Actions automatically uses the new domain for:
   - SSL certificate
   - Reverse proxy configuration
   - All deployment steps

That's it! No code changes needed. ✅

## Testing Locally

You can test with a local domain:

```bash
# Run docker-compose locally with custom domain
DOMAIN=localhost docker-compose up -d

# Or with a test domain
DOMAIN=mytest.local docker-compose up -d
```

## Using with Multiple Deployments

You can even have **multiple secrets** for different deployments:

```yaml
# GitHub Actions (reusable workflow example)
env:
  DOMAIN: ${{ secrets.DOMAIN }}
```

This allows multiple repositories or branches to deploy to different domains.

## Verification

To verify the domain is being used correctly:

```bash
# SSH into your server
ssh root@YOUR_IP

# Check if SSL certificate is for correct domain
docker-compose exec caddy caddy list-modules

# View Caddyfile configuration
docker-compose exec caddy cat /etc/caddy/Caddyfile

# Check container environment
docker-compose exec app env | grep DOMAIN

# Test HTTPS
curl -v https://your-domain.here
```

## Troubleshooting

### "DOMAIN secret not set"

If deployment fails with this error:
1. Go to Settings → Secrets
2. Verify `DOMAIN` secret exists
3. Check the value is correct (no extra spaces)
4. Re-trigger deployment

### Domain doesn't match certificate

If SSL shows wrong domain:
1. Verify `DOMAIN` secret value
2. Run deployment again
3. Wait 30-60 seconds for Caddy to obtain certificate
4. Check logs: `docker-compose logs caddy`

### Caddyfile shows wrong domain

Check that `DOMAIN` environment variable is set:
```bash
docker-compose exec app printenv | grep DOMAIN
```

If empty, the Caddyfile defaults to `localhost`.

## Summary

✅ One `DOMAIN` secret controls everything
✅ No hardcoded domains in code
✅ Easy to change domains
✅ Works with any domain name
✅ Automatically configures SSL
✅ Completely automated deployment

**Your deployment is now truly domain-agnostic!** 🎉
