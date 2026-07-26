# Reticent AI — Developer Integration Guide for FinTech

Welcome to the **Reticent AI Developer Integration Guide**. This document is designed for enterprise software engineers, DevOps architects, and FinTech developers implementing privacy-first Large Language Model (LLM) pipelines.

Reticent AI acts as a **zero-latency, zero-leakage privacy proxy middleware**. It intercepts outbound prompts, tokenizes Personally Identifiable Information (PII), Payment Card Industry (PCI) data, and credentials before payloads reach external LLM providers (such as OpenAI, Anthropic, or Groq), and automatically rehydrates the surrogate tokens in the returning stream so your application experiences zero disruption.

---

## Table of Contents

1. [Security First: Zero-Hardcoding Architecture](#1-security-first-zero-hardcoding-architecture)
2. [Proxy Base URL Configuration](#2-proxy-base-url-configuration)
3. [Python SDK Integration (OpenAI / Official SDK)](#3-python-sdk-integration-openai--official-sdk)
4. [Node.js / TypeScript SDK Integration](#4-nodejs--typescript-sdk-integration)
5. [Raw HTTP / cURL Reference](#5-raw-http--curl-reference)
6. [Best Practices & Compliance Checklist](#6-best-practices--compliance-checklist)

---

## 1. Security First: Zero-Hardcoding Architecture

> [!IMPORTANT]
> **Never hardcode API keys, secrets, or proxy credentials directly in source code.** Hardcoded credentials pose an existential security threat, especially in FinTech environments subject to PCI-DSS, SOC 2, GDPR, and HIPAA compliance audits.

To securely authenticate against both the Reticent AI Proxy and your underlying LLM provider, you must utilize runtime environment variables loaded from secure secret managers (e.g., AWS Secrets Manager, HashiCorp Vault) or local `.env` files during development.

### Standard Environment Setup

Create a `.env` file in your project root:

```env
# Reticent AI Proxy Authentication Key
RETICENT_API_KEY=ret_live_9a8b7c6d5e4f3g2h1i0j

# Underlying LLM Provider Key (OpenAI / Anthropic / Groq)
OPENAI_API_KEY=sk-proj-1234567890abcdef1234567890abcdef

# Proxy Endpoint Override
RETICENT_BASE_URL=https://your-reticent-proxy.onrender.com/api/v1
```

> [!CAUTION]
> If an API key is accidentally committed to version control, consider it compromised immediately. Revoke and rotate the key in your Reticent AI Dashboard without delay.

---

## 2. Proxy Base URL Configuration

Most modern AI SDKs (such as official OpenAI or Anthropic libraries) allow you to override the default upstream endpoint by specifying a custom `base_url` (or `baseURL`).

By pointing the SDK to the Reticent AI Proxy and injecting your `RETICENT_API_KEY` into the default request headers via `X-API-Key`, you gain full PII sanitization **without changing a single line of your downstream business logic or prompt engineering**.

```mermaid
sequenceDiagram
    autonumber
    actor FinTechApp as FinTech Application (SDK)
    participant Reticent as Reticent AI Proxy Middleware
    participant LLM as Upstream LLM (OpenAI / Groq)

    FinTechApp->>Reticent: POST /api/v1 (Headers: X-API-Key, Authorization)
    Note over Reticent: Intercept & Tokenize PII<br/>(e.g., SSN -> [SSN_TOK_1])
    Reticent->>LLM: Forward Sanitized Payload
    LLM-->>Reticent: Return Tokenized Completion
    Note over Reticent: Rehydrate Tokens<br/>([SSN_TOK_1] -> Original SSN)
    Reticent-->>FinTechApp: Return Seamless, Rehydrated Response
```

---

## 3. Python SDK Integration (OpenAI / Official SDK)

The following snippet demonstrates how to configure the official Python `openai` library (`v1.0.0+`) to route requests through the Reticent AI Proxy.

### Prerequisites

```bash
pip install openai python-dotenv
```

### Implementation Snippet

```python
import os
from dotenv import load_dotenv
from openai import OpenAI

# 1. Load environment variables from .env file
load_dotenv()

reticent_api_key = os.environ.get("RETICENT_API_KEY")
openai_api_key = os.environ.get("OPENAI_API_KEY")
proxy_base_url = os.environ.get("RETICENT_BASE_URL", "http://localhost:8001/api/v1")

if not reticent_api_key or not openai_api_key:
    raise ValueError("Missing critical API credentials in environment variables.")

# 2. Initialize the client with base_url override and custom header injection
client = OpenAI(
    api_key=openai_api_key,          # Passed to upstream LLM
    base_url=proxy_base_url,         # Overridden to point to Reticent AI Proxy
    default_headers={
        "X-API-Key": reticent_api_key  # Authenticates against Reticent Proxy
    }
)

# 3. Execute standard chat completion requests
def generate_financial_advice(user_prompt: str) -> str:
    """
    Sends user input through Reticent AI Proxy. Any PII (SSN, Credit Card, Address,
    Email, Indian PAN/Aadhaar) is stripped before leaving your infrastructure.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional FinTech wealth management advisor."
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=0.2
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[Proxy Error] Failed to process request: {e}")
        raise

if __name__ == "__main__":
    # Test Payload containing highly sensitive PII
    raw_prompt = (
        "My client John Doe (SSN: 123-45-6789, residing at House No. 1442/22, "
        "mohali, Punjab) wants to refinance his credit card ending in 4321-8765-1111-2222."
    )
    
    print("--- Sending Raw Prompt ---")
    print(raw_prompt)
    print("\n--- Rehydrated Response from Reticent AI ---")
    print(generate_financial_advice(raw_prompt))
```

---

## 4. Node.js / TypeScript SDK Integration

For Node.js and TypeScript backends (Express, NestJS, Next.js API routes), integrate using the official `openai` NPM package.

### Prerequisites

```bash
npm install openai dotenv
# or
pnpm add openai dotenv
```

### Implementation Snippet

```typescript
import OpenAI from 'openai';
import 'dotenv/config';

// 1. Validate required environment variables
const reticentApiKey = process.env.RETICENT_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const proxyBaseUrl = process.env.RETICENT_BASE_URL || 'http://localhost:8001/api/v1';

if (!reticentApiKey || !openaiApiKey) {
  throw new Error('FATAL: Missing RETICENT_API_KEY or OPENAI_API_KEY in environment.');
}

// 2. Initialize OpenAI instance with baseURL and defaultHeaders
const openai = new OpenAI({
  apiKey: openaiApiKey,
  baseURL: proxyBaseUrl,
  defaultHeaders: {
    'X-API-Key': reticentApiKey, // Inject proxy authentication header
  },
});

/**
 * Executes a secure AI completion via Reticent Proxy.
 * All PII inside prompt tokens is masked before reaching OpenAI.
 */
export async function assessLoanEligibility(applicantPrompt: string): Promise<string | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an automated underwriting assistant for a digital bank.',
        },
        {
          role: 'user',
          content: applicantPrompt,
        },
      ],
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('[Reticent Proxy Exception]:', error);
    throw error;
  }
}

// Example Execution
async function runDemo() {
  const sampleInput = 
    'Applicant Jane Smith (email: jane.smith@fintech.io, phone: 555-019-2831) ' +
    'residing at 500 Park Avenue, Suite 402, requests a $50,000 credit line.';

  console.log('Executing secure proxy request...');
  const result = await assessLoanEligibility(sampleInput);
  console.log('\n--- Result ---');
  console.log(result);
}

if (require.main === module) {
  runDemo();
}
```

---

## 5. Raw HTTP / cURL Reference

If you are building custom HTTP clients, microservices in Go/Java/Rust, or testing endpoints via command line, send direct HTTP requests to the Reticent AI endpoint.

### Request Headers

| Header | Required | Description |
|---|---|---|
| `Content-Type` | Yes | Must be set to `application/json` |
| `X-API-Key` | Yes | Your Reticent AI Proxy API Key (`RETICENT_API_KEY`) |
| `Authorization` | Optional | Your upstream LLM Bearer token (`Bearer sk-...`) |

### cURL Command Example

```bash
curl -X POST "https://your-reticent-proxy.onrender.com/api/v1/sanitize/" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ret_live_9a8b7c6d5e4f3g2h1i0j" \
  -H "Authorization: Bearer sk-proj-1234567890abcdef1234567890abcdef" \
  -d '{
    "prompt": "Please analyze portfolio risk for account holder John Doe (SSN: 000-12-3456) living at 1442/22, mohali, Punjab.",
    "model": "gpt-4o"
  }'
```

### Sample JSON Response

```json
{
  "request_id": "req_88a7b6c5d4e3",
  "status": "success",
  "sanitized_prompt": "Please analyze portfolio risk for account holder [PERSON_TOK_1] (SSN: [SSN_TOK_1]) living at [ADDRESS_TOK_1].",
  "original_length": 113,
  "sanitized_length": 112,
  "pii_count": 3,
  "rehydrated_completion": "Based on our analysis for account holder John Doe, the portfolio risk is moderate..."
}
```

---

## 6. Best Practices & Compliance Checklist

Use this checklist to ensure your FinTech deployment meets enterprise security standards before going live:

> [!TIP]
> **Audit Logging**: All redactions and token maps are logged asynchronously to MongoDB Atlas without storing raw text, ensuring you maintain a complete SOC 2 / ISO 27001 audit trail without accumulating PII liability in your logs.

- [ ] **Git Ignore `.env`**: Confirm that `.env`, `.env.local`, and any credential files are explicitly listed in your `.gitignore` file.
- [ ] **Rotate Exposed Keys**: Regularly rotate API keys every 90 days. If a key is leaked in CI/CD build logs or chat channels, revoke it immediately via the dashboard.
- [ ] **Use Least-Privilege API Keys**: Assign scoped API keys in Reticent AI that only have access to designated models or environments (e.g., `staging-only` vs. `prod-finance`).
- [ ] **Enforce TLS 1.3**: Always configure your client endpoints to connect over HTTPS (`https://`) to prevent man-in-the-middle (MITM) interception on local networks.
- [ ] **Verify Header Case**: While HTTP headers are case-insensitive by spec, always use standard capitalization (`X-API-Key` and `Authorization`) to ensure compatibility across all reverse proxies and API gateways.
- [ ] **Monitor Audit Dashboards**: Regularly review the PII interception metrics in your Reticent Dashboard to catch abnormal data exfiltration attempts or unusual prompt volumes.
