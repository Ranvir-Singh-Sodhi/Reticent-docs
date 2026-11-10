# Reticent AI Developer Integration Guide

This guide shows how to send a text prompt or supported document to Reticent
AI and receive the LLM response. Reticent AI is an HTTP API; its sanitize
endpoint is **not** an OpenAI-compatible chat-completions endpoint.

## How a request works

1. Your server sends a prompt to Reticent AI with an API key.
2. Reticent AI applies the masking rules for that API key.
3. The sanitized prompt is sent to Groq using the provider key configured on
   the Reticent AI server.
4. Reticent AI restores matched values in the response and returns both the
   sanitized and restored text.

Only the sanitized prompt is sent to Groq. The API response includes the
restored response, so treat it as potentially containing sensitive data.
Redaction is pattern-based and cannot guarantee that every sensitive value
will be detected.

## Before you start

- Create an API key in the Reticent AI dashboard. Keep it on your server; do
  not put it in browser code or commit it to source control.
- Configure `GROQ_API_KEY` on the Reticent AI server. Callers do not send an
  OpenAI or Groq provider key.
- Free and Startup accounts use the fixed GPT OSS 20B model. Enterprise
  accounts use the model selected in the account settings (GPT OSS 20B or 120B).
  The sanitize endpoint does not accept a `model`, `messages`, `temperature`,
  or `stream` option.
- Use HTTPS for deployed environments.

## Plans, quotas, and models

The plan and monthly quotas belong to the user account and are shared by all
API keys owned by that account. Startup allows
10,000,000 request units **or** 10,000,000 LLM tokens per calendar month,
whichever limit is reached first. Enterprise allows 50,000,000 request units
**or** 50,000,000 LLM tokens per calendar month, whichever is reached first. LLM
tokens include provider-reported prompt and completion tokens. Free accounts allow
100 request units per month and do not have a separate token quota.

There is no per-request character limit on the prompt. Request usage is
weighted by the complete prompt sent for processing, including extracted
document text: Each started block of 20,000 characters counts as one request unit
(1–20,000 characters = 1 unit; 20,001–40,000 = 2; 40,001–60,000 = 3).
Requests are not rejected just for being large. A weighted request can take
usage past the monthly request quota; subsequent requests are throttled with
HTTP `429` until the next calendar month. Reaching the separate monthly token
quota remains a hard stop. There is no automatic overage. Request and token
usage reset at the beginning of each calendar month. The 10 MB upload and
80,000-character extracted-text limits still apply. Free and Startup accounts
always use GPT OSS 20B. Enterprise accounts can use the account-selected GPT OSS
20B or GPT OSS 120B model.

The dashboard's **Sanitized requests** card and the plan usage bar both show
this account-wide request-unit total for the current month. A request is
counted when it passes authentication, before sanitizing runs, so a request that
later fails still counts toward quota. The PII-redacted and latency cards are
per selected API key.

## Endpoint and authentication

```text
POST /api/v1/sanitize/
X-API-Key: <your Reticent API key>
Content-Type: application/json
```

For local development, the full URL is
`http://127.0.0.1:8001/api/v1/sanitize/`. For a deployed service, replace the
host with the API URL provided by your deployment.

### Text request

Send a JSON object with one required string field:

```json
{
  "prompt": "Please review this customer application."
}
```

The endpoint accepts one caller-supplied prompt string, including prompts
larger than 20,000 characters. Larger prompts consume proportionally more
monthly request usage as described above. It does not accept OpenAI-style
role/message arrays.

### Successful response

```json
{
  "status": "success",
  "request_id": "request-id",
  "sanitized_prompt": "Please review this customer application.",
  "original_length": 40,
  "sanitized_length": 40,
  "llm_response": "The response with any matched values still masked.",
  "final_restored_response": "The response with matched values restored."
}
```

`llm_response` is the provider's response before restoration.
`final_restored_response` is normally the value to show to the user. Protect it
as you would any data that may contain the original sensitive values.

### Upload a file

Send `multipart/form-data` with a `file` field and an optional `prompt` field.
Use the limits and supported formats described in [Uploads](#uploads).

```sh
curl -X POST "$RETICENT_BASE_URL/sanitize/" \
  -H "X-API-Key: $RETICENT_API_KEY" \
  -F "prompt=Summarize this document." \
  -F "file=@./application.pdf"
```

Do not set `Content-Type` manually for multipart requests; `curl` supplies the
required boundary.

## Quickstarts

Set these environment variables on the machine running the client:

```text
RETICENT_API_KEY=<key created in the Reticent AI dashboard>
RETICENT_BASE_URL=https://<your-api-host>/api/v1
```

In PowerShell, you can set them for the current terminal like this:

```powershell
$env:RETICENT_API_KEY = "<key created in the Reticent AI dashboard>"
$env:RETICENT_BASE_URL = "https://api.meshguard-innovations.com/api/v1"
python app.py
```

For the Node.js example, run `node index.js` after setting the same variables.
Environment variables set this way are available only in the current terminal
session.

For local development, set `RETICENT_BASE_URL` to
`http://127.0.0.1:8001/api/v1`. The repository includes complete examples:

- [Python quickstart](app.py)
- [Node.js quickstart](index.js) (Node.js 18 or newer)

Both use the HTTP API directly and require no OpenAI SDK or provider key in
your application. They read process environment variables; they do not
automatically load a `.env` file.

### cURL text request

```sh
curl -X POST "$RETICENT_BASE_URL/sanitize/" \
  -H "X-API-Key: $RETICENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Please review this customer application."}'
```

In PowerShell, use `curl.exe` and the `$env:` variable syntax:

```powershell
curl.exe -X POST "$env:RETICENT_BASE_URL/sanitize/" `
  -H "X-API-Key: $env:RETICENT_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"prompt":"Please review this customer application."}'
```

Keep the API key in a server-side environment variable. Avoid placing it
directly in shell history or scripts.

## Masking behavior

Each API key has independent switches for email addresses, phone numbers,
credit-card numbers, and names. The Account Settings values are defaults for
new keys; change an existing key in the dashboard's **API Keys** masking
controls. Name matching uses patterns and person-context cues; it is not
general-purpose named-entity recognition.

Other supported redaction categories, including credentials, addresses, and
identity-related values, remain enabled independently of those four switches.
Uploaded spreadsheet columns with sensitive headings are also considered.
Pattern-based detection can miss values, so validate the behavior against
your own data before relying on it.

## Uploads

The endpoint accepts one file per request, up to 10 MB. Supported inputs are:

- UTF-8 source/configuration text, including common programming and
  configuration extensions, plus `Dockerfile`, `Containerfile`, and
  `Makefile`.
- `.docx` and `.xlsx`.
- `.pdf`, including scanned pages that require OCR.
- `.bmp`, `.jpeg`, `.jpg`, `.png`, `.tif`, `.tiff`, and `.webp` images.

Extraction and OCR run in memory. Extracted text is limited to 80,000
characters; PDFs are limited to 50 pages, with at most 20 pages requiring OCR.
Images and rendered PDF pages are limited to 25 million pixels. OCR uses
English Tesseract and times out after 10 seconds per page. The Docker images
include Tesseract; local installations must install it and make it available
on `PATH`.

Encrypted PDFs, legacy `.doc`/`.xls` files, binary files, and code/config files
that are not UTF-8 text are not supported.

## Errors

The API returns JSON errors. Common status codes are:

| Status | Meaning |
|---|---|
| `400` | Missing/invalid prompt, prompt too long, or unsupported/oversized upload. |
| `401` | Missing, invalid, or revoked API key. |
| `429` | The API key reached its monthly request or LLM-token quota; requests resume after reset. |
| `502` | The LLM provider is not configured or could not return a response. |
| `500` | Redaction failed; the request is blocked. |
| `503` | Usage storage is temporarily unavailable. |

Check the `error` and, when provided, `request_id` fields. Do not retry
validation errors unchanged.

## Privacy and operational notes

Reticent AI processes prompts and uploaded content in memory and its audit
records store request metadata rather than raw prompt or file contents.
Assess the complete deployment separately, including reverse-proxy, hosting,
application, and provider logging and retention policies. Secure the API key,
use TLS, and avoid logging raw prompts or restored responses in your own
application unless required and appropriately protected.

### Encryption

- **In transit:** The Reticent AI API is served over HTTPS only in production
  (HTTP redirects to HTTPS and HSTS is enabled). Always call the API with an
  `https://` base URL; never send your API key over plain HTTP.
- **At rest:** API keys are stored encrypted (AES-256-GCM), so keep your own
  copy in a secrets manager. Pending-registration
  details and payment-session identifiers are encrypted the same way, and
  passwords are stored only as salted hashes.
- Prompts and uploads are not stored; they are processed in memory and sent to
  the LLM provider over TLS.
