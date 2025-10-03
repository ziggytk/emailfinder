#!/bin/bash

# DigitalOcean Deployment Script
# This script will upload and deploy the utility agent server

echo "🚀 DigitalOcean Deployment Script"
echo "=================================="

# Check if droplet IP is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your DigitalOcean droplet IP address"
    echo "Usage: ./deploy-to-digitalocean.sh YOUR_DROPLET_IP"
    echo "Example: ./deploy-to-digitalocean.sh 123.456.789.012"
    exit 1
fi

DROPLET_IP=$1
echo "📡 Deploying to droplet: $DROPLET_IP"

# Check if server directory exists
if [ ! -d "server" ]; then
    echo "❌ Error: server directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📦 Uploading server files to droplet..."

# Create directory on droplet
ssh root@$DROPLET_IP "mkdir -p /opt/utility-agent"

# Upload server files
echo "📁 Uploading files..."
scp -r server/* root@$DROPLET_IP:/opt/utility-agent/

# Upload environment template
echo "⚙️ Setting up environment..."
ssh root@$DROPLET_IP "cd /opt/utility-agent && cp env.example .env"

echo "🔧 Running deployment script on droplet..."
ssh root@$DROPLET_IP "cd /opt/utility-agent && chmod +x deploy.sh && ./deploy.sh"

echo ""
echo "🎉 Deployment complete!"
echo "=================================="
echo "📊 Health check: http://$DROPLET_IP:3000/health"
echo "🤖 Agent endpoint: http://$DROPLET_IP:3000/api/agent/launch"
echo ""
echo "📝 Next steps:"
echo "1. SSH into your droplet: ssh root@$DROPLET_IP"
echo "2. Edit environment file: cd /opt/utility-agent && nano .env"
echo "3. Add your Supabase and Stripe credentials"
echo "4. Restart the service: docker-compose restart"
echo "5. Test the deployment: curl http://$DROPLET_IP:3000/health"
echo ""
echo "🔍 To check logs: docker-compose logs -f"
echo "🛑 To stop service: docker-compose down"
echo "🔄 To restart service: docker-compose restart"








