/**
 * Reticent AI — Quickstart Guide (Node.js)
 *
 * This minimal script demonstrates how to route OpenAI requests through the
 * Reticent AI privacy proxy using the official Node.js 'openai' package.
 * Any sensitive PII/PCI data in the prompt is automatically tokenized before
 * leaving your infrastructure and rehydrated in the returning completion stream.
 */

require('dotenv').config();
const OpenAI = require('openai');

// 1. Validate required environment variables
const reticentApiKey = process.env.RETICENT_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const proxyBaseUrl = process.env.RETICENT_BASE_URL || 'https://your-reticent-proxy.onrender.com/api/v1';

if (!reticentApiKey || !openaiApiKey) {
  console.error('FATAL: Missing RETICENT_API_KEY or OPENAI_API_KEY in environment variables.');
  console.error('Please copy .env.example to .env and insert your actual credentials.');
  process.exit(1);
}

// 2. Initialize OpenAI instance with baseURL override and defaultHeaders
const openai = new OpenAI({
  apiKey: openaiApiKey,           // Passed to upstream LLM provider
  baseURL: proxyBaseUrl,          // Overridden to point to Reticent AI Proxy
  defaultHeaders: {
    'X-API-Key': reticentApiKey,  // Authenticates against Reticent Proxy
  },
});

/**
 * Executes a secure chat completion via Reticent AI Proxy.
 * All PII inside prompt tokens is masked before reaching OpenAI.
 *
 * @param {string} userPrompt - The raw prompt containing potential PII/PCI data.
 * @returns {Promise<string|null>} The rehydrated AI completion text.
 */
async function assessPortfolioRisk(userPrompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional FinTech wealth management advisor.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.2,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('[Proxy Error] Failed to process request:', error);
    throw error;
  }
}

// 3. Execute demo with mock FinTech prompt containing dummy PII
async function runDemo() {
  const mockFintechPrompt =
    'My client John Doe (SSN: 123-45-6789, email: j.doe@fintech.sample, ' +
    'residing at 742 Evergreen Terrace, Springfield) wants to rebalance his ' +
    'portfolio and inquire about credit line increases for card ending in 4321-8765-1111-2222.';

  console.log('--- Sending Mock FinTech Prompt ---');
  console.log(mockFintechPrompt);
  console.log('\n--- Rehydrated Response from Reticent AI ---');

  try {
    const result = await assessPortfolioRisk(mockFintechPrompt);
    console.log(result);
  } catch (error) {
    console.error('Demo execution failed:', error.message);
  }
}

if (require.main === module) {
  runDemo();
}

module.exports = { assessPortfolioRisk, openai };
