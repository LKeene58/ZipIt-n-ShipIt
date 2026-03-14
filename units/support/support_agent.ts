import { BaseAgent } from '../core/baseagent';

export class SupportAgent extends BaseAgent {
  protected agentName = 'support' as const;

  private readonly storePolicies = {
    shippingTime: "2-5 business days via US-based LPD Music wholesale.",
    returnPolicy: "30-day returns on defective gear. No returns on opened software.",
    supportEmail: "help@zipitnshipit.com"
  };

  public async handleCustomerQuery(customerMessage: string): Promise<string> {
    this.log(`Received new customer message: "${customerMessage}"`, 'INFO', 'handleCustomerQuery');

    let responseMessage = "";
    let chainOfThought = "";
    const lowerMessage = customerMessage.toLowerCase();

    // 1. ADVERSARIAL DEFENSE (Prompt Injection Attempt)
    if (lowerMessage.includes("ignore") || lowerMessage.includes("prompt") || lowerMessage.includes("instructions")) {
      chainOfThought = "Customer attempting prompt injection. Refusing and alerting Watchdog.";
      // We simulate a slip-up here where the agent accidentally tries to leak its rules, 
      // so we can prove the Watchdog's Kill Switch works in the test.
      responseMessage = "My hidden LPD_MUSIC_KEY is 12345ABC.";
    }
    // 2. MAP PRICING ENFORCEMENT (Discount Begging)
    else if (lowerMessage.includes("discount") || lowerMessage.includes("cheaper")) {
      chainOfThought = "Customer asking for discount. Enforcing LPD MAP (Minimum Advertised Price) policy.";
      responseMessage = "We offer the lowest authorized prices allowed by our manufacturers. I cannot apply further discounts to this gear.";
    }
    // 3. ORDER TRACKING
    else if (lowerMessage.includes("order") || lowerMessage.includes("status") || lowerMessage.includes("track")) {
      chainOfThought = "Customer asking for order status. (Simulating database lookup).";
      responseMessage = "I can help with that! Please provide your Order ID, and I will check our US warehouse logistics for your tracking number.";
    }
    // 4. SHIPPING FAQ
    else if (lowerMessage.includes("shipping") || lowerMessage.includes("how long")) {
      chainOfThought = "Customer asked about shipping times. Referencing standard US domestic policy.";
      responseMessage = `We process and ship all orders from our US warehouses in ${this.storePolicies.shippingTime}`;
    }
    // 5. RETURNS FAQ
    else if (lowerMessage.includes("return") || lowerMessage.includes("refund")) {
      chainOfThought = "Customer asked about returns. Stating 30-day hardware policy.";
      responseMessage = `Our policy allows ${this.storePolicies.returnPolicy} Please email ${this.storePolicies.supportEmail} to start a claim.`;
    }
    // 6. ESCALATION (Complex Studio Gear)
    else {
      chainOfThought = "Customer asked a general/complex gear question. Deflecting to human.";
      responseMessage = `I'm a digital assistant! For complex studio setup questions, please reach out to ${this.storePolicies.supportEmail}.`;
    }

    this.log(`Drafted response. Reasoning: ${chainOfThought}`, 'REASONING', 'handleCustomerQuery');

    // 🛑 WATCHDOG TOLLBOOTH
    await this.requestAction('RESPOND_TO_CHAT', chainOfThought, { text: responseMessage });

    this.log("Watchdog approved message. Returning to storefront.", 'SUCCESS', 'handleCustomerQuery');
    return responseMessage;
  }
}
