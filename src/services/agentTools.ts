import { playwrightAgent } from './playwrightAgent.ts';

/**
 * Tool function implementations that match your skeleton design
 * Each function returns a JSON-serialized string
 */

export async function open_url(args: { url: string }): Promise<string> {
  // Ensure browser is initialized
  if (!playwrightAgent['page']) {
    await playwrightAgent.initialize();
  }
  return await playwrightAgent.openUrl(args.url);
}

export async function get_dom_text(): Promise<string> {
  // Ensure browser is initialized
  if (!playwrightAgent['page']) {
    await playwrightAgent.initialize();
  }
  return await playwrightAgent.getDomText();
}

export async function click_text_like(args: { target: string; synonyms: string[] }): Promise<string> {
  // Ensure browser is initialized
  if (!playwrightAgent['page']) {
    await playwrightAgent.initialize();
  }
  return await playwrightAgent.clickTextLike(args.target, args.synonyms);
}

export async function wait_for_navigation(): Promise<string> {
  // Ensure browser is initialized
  if (!playwrightAgent['page']) {
    await playwrightAgent.initialize();
  }
  return await playwrightAgent.waitForNavigation();
}

export async function current_url(): Promise<string> {
  // Ensure browser is initialized
  if (!playwrightAgent['page']) {
    await playwrightAgent.initialize();
  }
  return await playwrightAgent.getCurrentUrl();
}

// Export all tool functions for dynamic access
export const agentTools = {
  open_url,
  get_dom_text,
  click_text_like,
  wait_for_navigation,
  current_url
};

/**
 * Tool definitions for OpenAI function calling
 * These match your skeleton exactly
 */
export const tools = [
  {
    type: "function",
    function: {
      name: "open_url",
      description: "Open a web page by absolute URL.",
      parameters: {
        type: "object",
        properties: { 
          url: { 
            type: "string", 
            description: "Absolute URL to open (https://…)" 
          } 
        },
        required: ["url"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_dom_text",
      description: "Return a snapshot of visible link/button texts for semantic selection. Do not include hidden nodes.",
      parameters: { 
        type: "object", 
        properties: {}, 
        additionalProperties: false 
      }
    }
  },
  {
    type: "function",
    function: {
      name: "click_text_like",
      description: "Click the first anchor or button whose text matches the target or any synonym (case-insensitive, partial match allowed).",
      parameters: {
        type: "object",
        properties: {
          target: { 
            type: "string", 
            description: "Primary semantic target, e.g., 'Guest Pay'." 
          },
          synonyms: {
            type: "array",
            items: { type: "string" },
            description: "Fallback synonyms, e.g., ['one-time payment','pay without logging in','guest payment','pay as guest']"
          }
        },
        required: ["target", "synonyms"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "wait_for_navigation",
      description: "Wait for page navigation and return { url, title }.",
      parameters: { 
        type: "object", 
        properties: {}, 
        additionalProperties: false 
      }
    }
  },
  {
    type: "function",
    function: {
      name: "current_url",
      description: "Return the current page URL.",
      parameters: { 
        type: "object", 
        properties: {}, 
        additionalProperties: false 
      }
    }
  }
] as const;

/**
 * System and developer instructions from your skeleton
 */
export const SYSTEM = `
You are a cautious web-navigation agent. Your sole objective is to reach Con Edison's "Guest Pay" (one-time payment) page without logging in or filling forms.
Rules:
- Use only the available tools.
- Prefer semantic intent over exact text; try synonyms.
- After each click, wait for navigation before deciding next step.
- STOP when the URL or title clearly indicates a guest/one-time payment page.
- Do NOT submit payments or enter credentials.
Return a short JSON status at the end with { reached: boolean, url: string, title?: string }.
`;

export const DEVELOPER = `
Target site: https://www.coned.com/
Primary intent terms: "Guest Pay", "Guest Payment", "One-Time Payment".
Fallback synonyms: "Pay without logging in", "Pay as guest", "Make a one-time payment".
Heuristic success signals: URL or title contains 'guest', 'one-time', or a known payments path.
`;
