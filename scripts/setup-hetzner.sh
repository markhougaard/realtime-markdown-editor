#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Hetzner Server Setup Script${NC}"
echo "This script will set up your Hetzner server for Docker deployment"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ This script must be run as root${NC}"
  exit 1
fi

echo -e "${BLUE}📦 Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

echo -e "${BLUE}📦 Installing Docker...${NC}"
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Add docker group
usermod -aG docker root

echo -e "${BLUE}📦 Installing Docker Compose...${NC}"
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

echo -e "${BLUE}📦 Installing Git...${NC}"
apt-get install -y git

echo -e "${BLUE}📦 Setting up application directory...${NC}"
mkdir -p /root/markdown-editor
cd /root/markdown-editor

echo -e "${BLUE}📦 Cloning repository...${NC}"
git clone https://github.com/${GITHUB_REPO:?Error: GITHUB_REPO not set} .

echo -e "${BLUE}🔑 Setting up Docker login...${NC}"
echo "Enter your GitHub username:"
read GITHUB_USER
echo "Enter your GitHub personal access token (with read:packages scope):"
read -s GITHUB_TOKEN

echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

echo -e "${BLUE}🌐 Configuring Domain...${NC}"

# Check if DOMAIN is passed as environment variable
if [ -z "$DOMAIN" ]; then
  read -p "Enter your domain (e.g., your-domain.here): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
  echo -e "${RED}❌ Domain is required${NC}"
  exit 1
fi

read -p "Enter your email for Let's Encrypt: " EMAIL

echo -e "${BLUE}📝 Creating .env file...${NC}"
cat > /root/markdown-editor/.env.production << EOF
NODE_ENV=production
DATABASE_PATH=/app/data/documents.db
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}
EOF

echo -e "${BLUE}⚙️ Setting up Caddyfile...${NC}"
# Caddyfile is already in the repo, no changes needed

echo -e "${BLUE}🚀 Starting Docker containers...${NC}"
cd /root/markdown-editor
DOMAIN=${DOMAIN} docker-compose up -d

echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 15

echo -e "${BLUE}✅ Checking health...${NC}"
if docker-compose ps | grep -q "healthy\|Up"; then
  echo -e "${GREEN}✅ Containers are running!${NC}"
else
  echo -e "${RED}❌ Containers failed to start${NC}"
  docker-compose logs
  exit 1
fi

echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Update DNS records at your registrar to point to this server"
echo "   A record: $DOMAIN -> $(hostname -I | awk '{print $1}')"
echo ""
echo "2. Set up GitHub secrets in your repository:"
echo "   - HETZNER_HOST: $(hostname -I | awk '{print $1}')"
echo "   - HETZNER_USER: root"
echo "   - HETZNER_SSH_KEY: (your SSH private key)"
echo "   - DOMAIN: $DOMAIN"
echo ""
echo "3. Access your app at: https://$DOMAIN"
echo ""
echo -e "${BLUE}Useful commands (run from /root/markdown-editor):${NC}"
echo "  cd /root/markdown-editor"
echo "  docker-compose ps          # Check container status"
echo "  docker-compose logs -f     # View logs"
echo "  docker-compose down        # Stop containers"
echo "  docker-compose up -d       # Start containers"
