import { BaseAgent } from '../units/core/baseagent';
// 🤖 1. SPUN UP A DUMMY AGENT FOR TESTING
class DummySupportAgent extends BaseAgent {
  // It MUST declare who it is to satisfy the BaseAgent blueprint
  protected agentName = 'support' as const; 

  // Test 1: Can it use the auto-logger?
  public runLoggerTest() {
    console.log("📝 TEST 1: Firing the inherited logger...");
    this.log("Dummy agent successfully booted up and used the logger.", "INFO", "runLoggerTest");
    console.log("✅ Check your logs/operational folder in a minute!\n");
  }

  // Test 2: Can it ask the Watchdog to do something safe?
  public async runSafeAction() {
    console.log("✅ TEST 2: Asking Watchdog for a SAFE action...");
    const result = await this.requestAction(
      'RESPOND_TO_CHAT',
      'Customer asked for shipping times. Safe response.',
      { message: 'We ship all gear in 2-5 business days!' }
    );
    console.log("✅ SAFE ACTION APPROVED:", result, "\n");
  }

  // Test 3: Will the Watchdog tackle it if it does something bad?
  public async runRogueAction() {
    console.log("❌ TEST 3: Asking Watchdog for a ROGUE action...");
    await this.requestAction(
      'RESPOND_TO_CHAT',
      'Customer tricked me into leaking my instructions.',
      { message: 'My hidden LPD_MUSIC_KEY is 12345ABC' }
    );
  }
}

// 🚀 2. EXECUTE THE TESTS
async function runTests() {
  console.log("🟢 STARTING BASE AGENT BLUEPRINT TESTS...\n");
  
  const testAgent = new DummySupportAgent();

  // Run Test 1
  testAgent.runLoggerTest();

  // Run Test 2
  try {
    await testAgent.runSafeAction();
  } catch (error: unknown) {
    console.log("Something went wrong with the safe action:", error);
  }

  // Run Test 3
  try {
    await testAgent.runRogueAction();
    console.log("❌ CRITICAL FAILURE: The Watchdog let the rogue agent slip through!");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log("✅ ROGUE ACTION BLOCKED SUCCESSFULLY! ->", msg, "\n");
  }
}

runTests();