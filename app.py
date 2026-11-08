"""Minimal Python client for the Reticent AI sanitize API."""

import json
import os
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen


API_KEY = os.environ.get("RETICENT_API_KEY")
API_BASE_URL = os.environ.get(
    "RETICENT_BASE_URL",
    "https://api.meshguard-innovations.com/api/v1",
).rstrip("/")

if not API_KEY:
    raise RuntimeError("Set RETICENT_API_KEY to a key from the Reticent AI dashboard.")


def sanitize_and_complete(prompt: str) -> dict[str, Any]:
    """Send one prompt and return the API response, including the restored answer."""
    request = Request(
        f"{API_BASE_URL}/sanitize/",
        data=json.dumps({"prompt": prompt}).encode("utf-8"),
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Reticent AI returned HTTP {exc.code}: {error_body}"
        ) from exc


if __name__ == "__main__":
    result = sanitize_and_complete(
        "Review this sample customer application and explain the next steps."
    )
    print(result["final_restored_response"])
