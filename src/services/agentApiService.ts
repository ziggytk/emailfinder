/**
 * Agent API Service - Frontend service to communicate with the backend agent server
 */

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:3000';

export interface AgentSession {
  id: string;
  userId: string;
  billId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaunchAgentResponse {
  success: boolean;
  session: AgentSession;
  message: string;
}

export interface AgentStatus {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

/**
 * Launch the Playwright agent on the backend server
 */
export async function launchAgent(billId: string, userToken: string): Promise<LaunchAgentResponse> {
  try {
    console.log('🚀 Launching agent via API...', { billId });
    
    const response = await fetch(`${AGENT_API_URL}/api/agent/launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billId,
        userToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to launch agent');
    }

    const data = await response.json();
    console.log('✅ Agent launched successfully:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Failed to launch agent:', error);
    throw error;
  }
}

/**
 * Get agent session status
 */
export async function getAgentSession(sessionId: string, userToken: string): Promise<AgentSession | null> {
  try {
    const response = await fetch(`${AGENT_API_URL}/api/agent/session/${sessionId}?userToken=${encodeURIComponent(userToken)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to get agent session');
    }

    const data = await response.json();
    return data.session;
  } catch (error) {
    console.error('❌ Failed to get agent session:', error);
    throw error;
  }
}

/**
 * Get all agent sessions for a user
 */
export async function getAgentSessions(userToken: string): Promise<AgentSession[]> {
  try {
    const response = await fetch(`${AGENT_API_URL}/api/agent/sessions?userToken=${encodeURIComponent(userToken)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get agent sessions');
    }

    const data = await response.json();
    return data.sessions;
  } catch (error) {
    console.error('❌ Failed to get agent sessions:', error);
    throw error;
  }
}

/**
 * Poll agent session status until completion
 */
export async function pollAgentStatus(
  sessionId: string,
  userToken: string,
  onUpdate: (session: AgentSession) => void,
  intervalMs: number = 1000
): Promise<AgentSession> {
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const session = await getAgentSession(sessionId, userToken);
        
        if (!session) {
          clearInterval(pollInterval);
          reject(new Error('Session not found'));
          return;
        }

        onUpdate(session);

        if (session.status === 'completed' || session.status === 'failed') {
          clearInterval(pollInterval);
          resolve(session);
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, intervalMs);
  });
}

export const agentApiService = {
  launchAgent,
  getAgentSession,
  getAgentSessions,
  pollAgentStatus,
};

