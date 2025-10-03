# Utility Agent Server

A Node.js server that provides browser automation capabilities for utility bill payments using Puppeteer and Supabase.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your Supabase and Stripe credentials
```

### 3. Build and Run
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 4. Test the Server
```bash
node test-agent.js
```

## 🐳 Docker Deployment

### Build and Run with Docker
```bash
# Build the image
npm run docker:build

# Run the container
npm run docker:run
```

### Deploy to DigitalOcean
1. Create a DigitalOcean droplet (Ubuntu 22.04, $12/month)
2. Upload the server files to `/opt/utility-agent`
3. Run the deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Launch Agent
```
POST /api/agent/launch
Content-Type: application/json

{
  "billId": "bill-123",
  "userToken": "supabase-jwt-token"
}
```

### Get Agent Session
```
GET /api/agent/session/:sessionId?userToken=supabase-jwt-token
```

### Get User's Agent Sessions
```
GET /api/agent/sessions?userToken=supabase-jwt-token
```

## 🗄️ Database Schema

The server requires the following Supabase tables:

### agent_sessions
- `id` (TEXT, PRIMARY KEY)
- `user_id` (UUID, REFERENCES auth.users)
- `bill_id` (TEXT, REFERENCES bill_extractions)
- `status` (TEXT: 'idle', 'running', 'completed', 'failed')
- `progress` (INTEGER: 0-100)
- `current_step` (TEXT)
- `error` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key

## 🧪 Testing

### Local Testing
```bash
# Start the server
npm run dev

# In another terminal, run tests
node test-agent.js
```

### Production Testing
```bash
# Test health endpoint
curl http://YOUR_DROPLET_IP:3000/health

# Test agent launch (with real auth token)
curl -X POST http://YOUR_DROPLET_IP:3000/api/agent/launch \
  -H "Content-Type: application/json" \
  -d '{"billId":"test-bill","userToken":"your-supabase-jwt"}'
```

## 📊 Monitoring

### Health Check
The server provides a health check endpoint at `/health` that returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### Logs
- Application logs are written to stdout
- Screenshots are saved to `./screenshots/`
- Agent session data is stored in Supabase

## 🔒 Security

- All endpoints require Supabase JWT authentication
- User sessions are isolated by user ID
- Sensitive data is encrypted in Supabase
- CORS and security headers are configured

## 🚨 Troubleshooting

### Common Issues

1. **Browser fails to start**
   - Ensure Chrome dependencies are installed
   - Check Docker container has sufficient memory
   - Verify no-sandbox flags are set

2. **Supabase connection fails**
   - Verify environment variables are set correctly
   - Check Supabase project is active
   - Ensure service key has proper permissions

3. **Agent session not found**
   - Verify user authentication
   - Check session ID is correct
   - Ensure user owns the session

### Debug Mode
Set `NODE_ENV=development` for detailed logging and error messages.

## 📈 Performance

### Resource Requirements
- **Memory**: 512MB minimum (1GB recommended)
- **CPU**: 1 core minimum (2 cores recommended)
- **Storage**: 10GB minimum for screenshots and logs

### Optimization
- Screenshots are compressed and stored locally
- Browser instances are cleaned up after each session
- Database queries are optimized with indexes

## 🔄 Updates

To update the server:
1. Pull latest changes
2. Rebuild Docker image: `npm run docker:build`
3. Restart container: `docker-compose restart`

## 📞 Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify health endpoint: `curl http://localhost:3000/health`
3. Test with the provided test script: `node test-agent.js`








