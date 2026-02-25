#!/usr/bin/env python3
"""
Decode a Google News redirect URL to the actual article URL.

Uses the `googlenewsdecoder` package which handles both old-style
(base64-embedded) and new-style (batchexecute API) Google News URLs.

Usage:
    python3 scripts/decode_google_news_url.py <google_news_url>

Output (JSON):
    { "status": "ok", "url": "https://..." }
    { "status": "error", "message": "..." }
"""

import json
import sys

from googlenewsdecoder import new_decoderv1


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "No URL provided"}))
        sys.exit(1)

    source_url = sys.argv[1]

    try:
        result = new_decoderv1(source_url)

        if result.get("status"):
            print(json.dumps({"status": "ok", "url": result["decoded_url"]}))
        else:
            print(
                json.dumps(
                    {
                        "status": "error",
                        "message": result.get("message", "Decoding failed"),
                    }
                )
            )
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
