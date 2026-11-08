/**
 * Minimal Node.js 18+ client for the Reticent AI sanitize API.
 */

const apiKey = process.env.RETICENT_API_KEY;
const apiBaseUrl = (
  process.env.RETICENT_BASE_URL || 'https://api.meshguard-innovations.com/api/v1'
).replace(/\/+$/, '');

if (!apiKey) {
  throw new Error('Set RETICENT_API_KEY to a key from the Reticent AI dashboard.');
}

async function sanitizeAndComplete(prompt) {
  const response = await fetch(`${apiBaseUrl}/sanitize/`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Reticent AI returned HTTP ${response.status}: ${data.error || JSON.stringify(data)}`,
    );
  }

  return data;
}

async function runDemo() {
  const result = await sanitizeAndComplete(
    'Review this sample customer application and explain the next steps.',
  );
  console.log(result.final_restored_response);
}

if (require.main === module) {
  runDemo().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { sanitizeAndComplete };
