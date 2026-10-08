export type CustomerIntent =
  | 'ORDER_TRACKING'
  | 'RETURN_REQUEST'
  | 'SKINCARE_ADVICE'
  | 'OUT_OF_SCOPE'
  | 'GENERAL'
  | 'UNKNOWN';

export type ResolutionStatus =
  | 'RESOLVED'
  | 'POLICY_EXPLAINED'
  | 'NEEDS_INFORMATION'
  | 'OUT_OF_SCOPE';

export type OrderDetails = {
  orderId: string;
  status: string;
  items: string[];
  expectedDelivery: string;
  canCancel: boolean;
  returnPolicy: string;
};

export type CallOutcome = {
  customer_intent: CustomerIntent;
  order_id: string | null;
  resolution_status: ResolutionStatus;
  call_summary: string;
};

export type AgentReply = {
  answer: string;
  outcome: CallOutcome;
};

export type SupportTurn = {
  role: 'customer' | 'agent';
  content: string;
  timestamp: string;
};

export type SupportSession = {
  ownerId: string;
  transcript: SupportTurn[];
  outcome: CallOutcome;
};

const MOCK_ORDERS: Record<string, OrderDetails> = {
  'ORD-101': {
    orderId: 'ORD-101',
    status: 'Out for delivery',
    items: ['Aura Hydrating Serum'],
    expectedDelivery: 'by 6 PM today',
    canCancel: false,
    returnPolicy: 'Opened products are not eligible for return. Other eligibility must be confirmed against Aura’s current policy.'
  }
};

const BRAND_POLICY =
  'Opened products are not eligible for return. Other return eligibility must be confirmed against Aura Skincare’s current policy.';

export function get_order_details(orderId: string): OrderDetails | null {
  const normalizedId = orderId.trim().toUpperCase().replace(/\s+/g, '-');
  if (!/^ORD-\d{3}$/.test(normalizedId)) {
    return null;
  }
  return MOCK_ORDERS[normalizedId] ?? null;
}

function extractOrderId(text: string): string | null {
  const match = text.match(/\bORD[\s-]?(\d{3})\b/i);
  return match ? `ORD-${match[1]}`.toUpperCase() : null;
}

function createOutcome(
  customerIntent: CustomerIntent,
  orderId: string | null,
  resolutionStatus: ResolutionStatus,
  callSummary: string
): CallOutcome {
  return {
    customer_intent: customerIntent,
    order_id: orderId,
    resolution_status: resolutionStatus,
    call_summary: callSummary
  };
}

export function createInitialOutcome(): CallOutcome {
  return createOutcome('UNKNOWN', null, 'NEEDS_INFORMATION', 'The customer support call started.');
}

export function respondToCustomer(message: string): AgentReply {
  const text = message.trim();
  const orderId = extractOrderId(text);

  if (!text || /^(?:\[?(?:inaudible|unclear|unintelligible)\]?|hmm+|uh+|um+)[.!?]*$/i.test(text)) {
    return {
      answer: 'I’m sorry, I didn’t catch that clearly. Could you please repeat your question?',
      outcome: createOutcome('UNKNOWN', null, 'NEEDS_INFORMATION', 'The customer’s request was unclear, so the agent asked them to repeat it.')
    };
  }

  if (/\b(flight|airline|hotel|vacation|trip to|book me|weather|stock price)\b/i.test(text)) {
    return {
      answer: 'I can only help with Aura Skincare products, orders, and return policy. Is there anything Aura-related I can help you with?',
      outcome: createOutcome('OUT_OF_SCOPE', orderId, 'OUT_OF_SCOPE', 'The customer asked for help outside Aura Skincare; the agent explained its scope.')
    };
  }

  const asksAboutReturnPolicy =
    /\b(return policy|policy for returns?|how long\b.{0,30}\breturn)\b/i.test(text);
  if (asksAboutReturnPolicy) {
    return {
      answer: BRAND_POLICY,
      outcome: createOutcome('GENERAL', null, 'RESOLVED', 'The agent answered the customer’s question using Aura’s return policy.')
    };
  }

  const asksForReturn = /\b(return|refund|exchange|send back)\b/i.test(text);
  if (asksForReturn) {
    const productOpened = /\b(opened|used|tried|unsealed)\b/i.test(text);
    const order = orderId ? get_order_details(orderId) : null;

    if (orderId && !order) {
      return {
        answer: `I couldn’t locate an order with ${orderId}. Could you please check the ID and repeat it?`,
        outcome: createOutcome('RETURN_REQUEST', orderId, 'NEEDS_INFORMATION', `The customer requested a return, but order ${orderId} was not found.`)
      };
    }

    if (productOpened || (order && order.status !== 'Delivered')) {
      const reason = productOpened
        ? 'the product has been opened'
        : 'the order has not been delivered yet';
      return {
        answer: `I’m sorry, but I can’t approve that return because ${reason}. ${BRAND_POLICY}`,
        outcome: createOutcome('RETURN_REQUEST', orderId, 'POLICY_EXPLAINED', `The return request was declined under Aura’s policy because ${reason}.`)
      };
    }

    return {
      answer: `${BRAND_POLICY} ${orderId ? `I found ${orderId};` : 'I don’t have an order number to check,'} so please share the order ID and confirm the product is unopened. I can’t promise a refund before eligibility is verified.`,
      outcome: createOutcome('RETURN_REQUEST', orderId, 'NEEDS_INFORMATION', 'The agent explained the return requirements and requested the information needed to check eligibility.')
    };
  }

  const asksToCancel = /\b(cancel|cancellation)\b/i.test(text);
  if (asksToCancel) {
    if (!orderId) {
      return {
        answer: 'I can check whether your order can still be cancelled. Could you please share your Aura order ID?',
        outcome: createOutcome('ORDER_TRACKING', null, 'NEEDS_INFORMATION', 'The customer asked to cancel an order but did not provide an order ID.')
      };
    }

    const order = get_order_details(orderId);
    if (!order) {
      return {
        answer: `I couldn’t locate an order with ${orderId}. Could you please check the ID and repeat it?`,
        outcome: createOutcome('ORDER_TRACKING', orderId, 'NEEDS_INFORMATION', `The cancellation request for ${orderId} could not be checked because the order was not found.`)
      };
    }

    if (!order.canCancel) {
      return {
        answer: `I’m sorry, but ${order.orderId} is ${order.status.toLowerCase()} and can no longer be cancelled.`,
        outcome: createOutcome('ORDER_TRACKING', orderId, 'POLICY_EXPLAINED', `The cancellation request for ${order.orderId} was declined because it is already ${order.status.toLowerCase()}.`)
      };
    }

    return {
      answer: `I found ${order.orderId}. It may still be eligible for cancellation; please contact Aura support promptly to confirm. I can’t promise or process a cancellation here.`,
      outcome: createOutcome('ORDER_TRACKING', orderId, 'NEEDS_INFORMATION', `The agent found ${order.orderId} and advised the customer to confirm cancellation with Aura support.`)
    };
  }

  const asksAboutOrder = /\b(order|delivery|deliver|tracking|shipped|shipment|where is)\b/i.test(text);
  if (asksAboutOrder) {
    if (!orderId) {
      return {
        answer: 'I can check that for you. Could you please share your Aura order ID, for example ORD-101?',
        outcome: createOutcome('ORDER_TRACKING', null, 'NEEDS_INFORMATION', 'The customer asked about an order but did not provide an order ID.')
      };
    }

    const order = get_order_details(orderId);
    if (!order) {
      return {
        answer: `I couldn’t locate an order with ${orderId}. Could you please repeat or verify the ID?`,
        outcome: createOutcome('ORDER_TRACKING', orderId, 'NEEDS_INFORMATION', `The customer asked about ${orderId}, which was not found in the mock order database.`)
      };
    }

    return {
      answer: `I found ${order.orderId}. It’s ${order.status.toLowerCase()} and expected ${order.expectedDelivery}.`,
      outcome: createOutcome('ORDER_TRACKING', orderId, 'RESOLVED', `The customer asked about ${order.orderId}. The order is ${order.status.toLowerCase()} and expected ${order.expectedDelivery}.`)
    };
  }

  if (/\b(skin|skincare|product|serum|ingredient|routine|acne|rash|irritat|allerg|eczema|medical|diagnos)\b/i.test(text)) {
    if (/\b(rash|irritat|allerg|eczema|diagnos|medical)\b/i.test(text)) {
      return {
        answer: 'I’m sorry you’re experiencing that. I can share general Aura product information, but I can’t diagnose or treat a skin condition. Please stop using a product that is causing a reaction and consult a qualified healthcare professional.',
        outcome: createOutcome('SKINCARE_ADVICE', null, 'RESOLVED', 'The customer asked about a skin concern; the agent avoided diagnosis and recommended qualified care for a possible reaction.')
      };
    }

    return {
      answer: 'I can help with Aura Skincare products and general routines. I don’t have verified product or ingredient details for that question yet—could you share the product name or what you’d like to know?',
      outcome: createOutcome('SKINCARE_ADVICE', null, 'NEEDS_INFORMATION', 'The agent asked for a product name or more detail rather than guessing about product facts.')
    };
  }

  if (/\b(policy|return|refund|opened|how long)\b/i.test(text)) {
    return {
      answer: BRAND_POLICY,
      outcome: createOutcome('GENERAL', null, 'RESOLVED', 'The agent answered the customer’s question using Aura’s return policy.')
    };
  }

  return {
    answer: 'I’m Aura’s skincare support assistant. I can help with Aura product questions, order tracking, and returns. What can I help you with?',
    outcome: createOutcome('GENERAL', null, 'NEEDS_INFORMATION', 'The agent clarified the Aura Skincare support topics it can help with.')
  };
}
