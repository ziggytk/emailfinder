#!/bin/bash

# Utility Agent Server Deployment Script
# Run this script on your DigitalOcean droplet

echo "🚀 Deploying Utility Agent Server..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    apt-get install -y docker-compose
fi

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/utility-agent
cd /opt/utility-agent

# Copy application files (you'll need to upload these)
echo "📋 Please upload your application files to /opt/utility-agent"
echo "   - package.json"
echo "   - tsconfig.json"
echo "   - Dockerfile"
echo "   - docker-compose.yml"
echo "   - src/ directory"
echo "   - .env file"

# Build and start the application
echo "🔨 Building and starting the application..."
docker-compose up -d --build

# Check if the application is running
echo "✅ Checking application status..."
sleep 10
curl -f http://localhost:3000/health || echo "❌ Application failed to start"

echo "🎉 Deployment complete!"
echo "📊 Health check: http://YOUR_DROPLET_IP:3000/health"
echo "🤖 Agent endpoint: http://YOUR_DROPLET_IP:3000/api/agent/launch"

