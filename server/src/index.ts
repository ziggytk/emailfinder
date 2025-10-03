import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AgentService } from './services/agentService';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Initialize Agent Service
const agentService = new AgentService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Agent launch endpoint
app.post('/api/agent/launch', async (req, res) => {
  try {
    const { billId, userToken } = req.body;
    
    if (!billId || !userToken) {
      return res.status(400).json({ error: 'Missing required fields: billId, userToken' });
    }
    
    // Validate user token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(userToken);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log(`🤖 Launching agent for user ${user.id}, bill ${billId}`);
    
    // Launch the agent
    const session = await agentService.launchAgent(billId, user.id);
    
    res.json({ 
      success: true,
      session,
      message: 'Agent launched successfully'
    });
    
  } catch (error) {
    console.error('Agent launch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get agent session endpoint
app.get('/api/agent/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userToken } = req.query;
    
    if (!userToken) {
      return res.status(400).json({ error: 'Missing userToken' });
    }
    
    // Validate user token
    const { data: { user }, error } = await supabase.auth.getUser(userToken as string);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get session
    const session = await agentService.getAgentSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify user owns this session
    if (session.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ session });
    
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's agent sessions endpoint
app.get('/api/agent/sessions', async (req, res) => {
  try {
    const { userToken } = req.query;
    
    if (!userToken) {
      return res.status(400).json({ error: 'Missing userToken' });
    }
    
    // Validate user token
    const { data: { user }, error } = await supabase.auth.getUser(userToken as string);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get sessions
    const sessions = await agentService.getAgentSessions(user.id);
    
    res.json({ sessions });
    
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Utility Agent Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Agent launch: http://localhost:${PORT}/api/agent/launch`);
  console.log(`📋 Agent sessions: http://localhost:${PORT}/api/agent/sessions`);
});

export default app;
