"""
Reticent AI — Quickstart Guide (Python)

This minimal script demonstrates how to route OpenAI requests through the
Reticent AI privacy proxy using the official Python 'openai' SDK.
Any sensitive PII/PCI data in the prompt is automatically tokenized before
leaving your infrastructure and rehydrated in the returning completion stream.
"""

import os
from dotenv import load_dotenv
from openai import OpenAI

# 1. Load environment variables from local .env file
load_dotenv()

reticent_api_key = os.environ.get("RETICENT_API_KEY")
openai_api_key = os.environ.get("OPENAI_API_KEY")
proxy_base_url = os.environ.get("RETICENT_BASE_URL", "https://your-reticent-proxy.onrender.com/api/v1")

if not reticent_api_key or not openai_api_key:
    raise ValueError(
        "FATAL: Missing RETICENT_API_KEY or OPENAI_API_KEY in environment variables.\n"
        "Please copy .env.example to .env and insert your actual credentials."
    )

# 2. Initialize the OpenAI client with base_url override and custom header injection
client = OpenAI(
    api_key=openai_api_key,          # Passed to upstream LLM provider
    base_url=proxy_base_url,         # Overridden to point to Reticent AI Proxy
    default_headers={
        "X-API-Key": reticent_api_key  # Authenticates against Reticent Proxy
    }
)


def assess_portfolio_risk(user_prompt: str) -> str:
    """
    Sends user input through the Reticent AI Proxy. Any PII/PCI data (such as SSNs,
    credit card numbers, email addresses, or physical addresses) is sanitized before
    leaving your infrastructure.
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
    # Mock FinTech prompt containing dummy Personally Identifiable Information (PII)
    mock_fintech_prompt = (
        "My client John Doe (SSN: 123-45-6789, email: j.doe@fintech.sample, "
        "residing at 742 Evergreen Terrace, Springfield) wants to rebalance his "
        "portfolio and inquire about credit line increases for card ending in 4321-8765-1111-2222."
    )

    print("--- Sending Mock FinTech Prompt ---")
    print(mock_fintech_prompt)
    print("\n--- Rehydrated Response from Reticent AI ---")
    print(assess_portfolio_risk(mock_fintech_prompt))
