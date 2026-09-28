import type { ServIntentRequest, ServStructuredIntent } from './types';
import { toFixed } from '../core/fixedPoint';

const DEFAULT_SERV_URL = 'https://inference-api.openserv.ai/v1';
const DEFAULT_MODEL = 'serv-standard';

export async function requestServPlan(
  req: ServIntentRequest
): Promise<ServStructuredIntent> {
  const apiKey = process.env.SERV_API_KEY;
  const baseUrl = process.env.SERV_BASE_URL || DEFAULT_SERV_URL;
  const model = process.env.SERV_MODEL || DEFAULT_MODEL;

  const systemPrompt = `You are the SERV Reasoning Engine configured for UnitSeal Treasury Protocol on Robinhood Chain.
Your job is to parse unstructured human intent regarding Stock Token operations into a strictly typed canonical execution intent.
You MUST reason about:
1. Exact Action Type: either TRANSFER or REBALANCE
2. Target Economic Value in USD: extract or calculate the intended USD value
3. Execution constraints: capability (market/extended/overnight/fractional), slippage, expiry
4. Invariants: The required multiplier MUST match the current observed multiplier unless explicit adjustments are instructed.
5. Provide a clear, professional operational rationale.

You MUST reply with ONLY a single valid JSON object in the following format (no markdown, no backticks, no extra text):
{
  "actionType": "TRANSFER" | "REBALANCE",
  "tokenSymbol": string,
  "targetEconomicValueUsd": string, // e.g. "5000.00"
  "recipientAddress": string, // 0x... hex address
  "requiredCapability": "market" | "extended" | "overnight" | "fractional",
  "maxSlippageBps": number,
  "expirySeconds": number,
  "rationale": string
}`;

  const userPrompt = `Intent: "${req.userIntent}"
Context:
- Token: ${req.tokenSymbol} (${req.tokenAddress})
- Sender: ${req.senderAddress}
- Default Recipient: ${req.recipientAddress}
- Current Multiplier: ${(Number(req.currentMultiplier) / 1e18).toFixed(4)}
- Current Share Price USD: ${(Number(req.pricePerShareUsd) / 1e18).toFixed(2)}
- Chain ID: ${req.chainId.toString()}`;

  if (!apiKey) {
    console.warn('[SERV Adapter] No SERV_API_KEY configured, utilizing deterministic fallback');
    return createDeterministicFallback(req, 'Fallback: SERV_API_KEY not configured');
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SERV Adapter] API error ${response.status}: ${errorText}`);
      return createDeterministicFallback(req, `Fallback: SERV API responded ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      return createDeterministicFallback(req, 'Fallback: Empty response from SERV');
    }

    // Clean potential markdown wrappers
    const jsonStr = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      actionType: parsed.actionType === 'REBALANCE' ? 'REBALANCE' : 'TRANSFER',
      tokenSymbol: parsed.tokenSymbol || req.tokenSymbol,
      tokenAddress: req.tokenAddress,
      recipientAddress: (parsed.recipientAddress as `0x${string}`) || req.recipientAddress,
      targetEconomicValueUsd: toFixed(parsed.targetEconomicValueUsd || '1000.0'),
      requiredMultiplier: req.currentMultiplier,
      requiredCapability: parsed.requiredCapability || 'market',
      maxSlippageBps: parsed.maxSlippageBps || 50,
      expirySeconds: parsed.expirySeconds || 300,
      rationale: parsed.rationale || `Parsed from human intent: ${req.userIntent}`,
      servModelUsed: model,
      servCompletionId: data.id,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SERV Adapter] Execution failed:', errMessage);
    return createDeterministicFallback(req, `Fallback: ${errMessage}`);
  }
}

function createDeterministicFallback(
  req: ServIntentRequest,
  reason: string
): ServStructuredIntent {
  // Extract potential dollar amount from intent (e.g. "$5000" or "5000 USD")
  const match = req.userIntent.match(/\$?(\d+(?:\.\d+)?)\s*(?:usd|dollars)?/i);
  const targetValue = match ? match[1] : '1000.0';

  return {
    actionType: req.userIntent.toLowerCase().includes('rebalance') ? 'REBALANCE' : 'TRANSFER',
    tokenSymbol: req.tokenSymbol,
    tokenAddress: req.tokenAddress,
    recipientAddress: req.recipientAddress,
    targetEconomicValueUsd: toFixed(targetValue),
    requiredMultiplier: req.currentMultiplier,
    requiredCapability: 'market',
    maxSlippageBps: 50,
    expirySeconds: 300,
    rationale: `Deterministic analysis of intent: "${req.userIntent}". ${reason}`,
    servModelUsed: 'serv-standard (deterministic compiler)',
  };
}
