# Environment Setup Guide

After deploying to DigitalOcean, you need to configure your environment variables.

## 🔧 **Step 1: SSH into your droplet**
```bash
ssh root@YOUR_DROPLET_IP
```

## 🔧 **Step 2: Navigate to the app directory**
```bash
cd /opt/utility-agent
```

## 🔧 **Step 3: Edit the environment file**
```bash
nano .env
```

## 🔧 **Step 4: Add your credentials**

Replace the placeholder values with your actual credentials:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Security
JWT_SECRET=your_random_jwt_secret_here
```

## 🔧 **Step 5: Save and exit**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

## 🔧 **Step 6: Restart the service**
```bash
docker-compose restart
```

## 🔧 **Step 7: Test the deployment**
```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 🔍 **Troubleshooting**

### If the service won't start:
```bash
# Check logs
docker-compose logs -f

# Check if containers are running
docker ps

# Restart everything
docker-compose down
docker-compose up -d --build
```

### If you can't access from outside:
```bash
# Check if port 3000 is open
netstat -tlnp | grep 3000

# Open port 3000 in firewall
ufw allow 3000
```

## 📊 **Monitoring**

### Check service status:
```bash
docker-compose ps
```

### View logs:
```bash
docker-compose logs -f utility-agent
```

### Restart service:
```bash
docker-compose restart
```

### Stop service:
```bash
docker-compose down
```

## 🔒 **Security Notes**

- Never commit your `.env` file to version control
- Use strong, random values for `JWT_SECRET`
- Keep your Supabase service key secure
- Use test Stripe keys for development
- Switch to live Stripe keys for production








