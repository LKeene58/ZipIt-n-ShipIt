import { auditLog } from '../../src/services/logger';
import { Watchdog, StatementOfIntent } from '../security/watchdog';

/**
 * 🧬 THE BASE AGENT BLUEPRINT
 * Every AI worker in your system extends this class. It guarantees they 
 * automatically follow the 2026 logging and Zero Trust security protocols.
 */
export abstract class BaseAgent {
  // Enforces that every agent must declare exactly who they are
  protected abstract agentName: 'sourcing' | 'order_fulfillment' | 'support';

  /**
   * 🗣️ THE INTERNAL MONOLOGUE (Auto-Logger)
   * Agents just call this.log('Found a product') and it automatically 
   * tags it with their name and routes it to the correct compliance folder.
   */
  protected log(
    message: string | object, 
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'REASONING' | 'RAW' = 'INFO',
    functionName: string = 'general'
  ): void {
    auditLog(message, level, this.agentName, functionName);
  }

  /**
   * 🛑 THE ZERO TRUST TOLLBOOTH
   * Agents are stripped of direct API access. They MUST use this function
   * to ask the Watchdog to execute actions for them.
   */
  protected async requestAction(
    action: StatementOfIntent['action'],
    chainOfThought: string,
    payload: unknown,
    targetSku?: string
  ): Promise<unknown> {
    
    // 1. Log what the agent is trying to do
    this.log(`Drafting Statement of Intent for: ${action}`, 'INFO', 'requestAction');
    
    // 2. Build the official Intent payload
    const intent: StatementOfIntent = {
      agentName: this.agentName,
      action,
      chainOfThought,
      payload,
      targetSku
    };

    // 3. Pass it to the Judge (Watchdog) for execution or termination
    try {
      const result = await Watchdog.evaluateIntent(intent);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(`ACTION BLOCKED BY WATCHDOG: ${msg}`, 'ERROR', 'requestAction');
      throw error; // Re-throw so the rogue agent process actually dies
    }
  }
}