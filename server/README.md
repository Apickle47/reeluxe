# Current hosting

Gemini is live on the existing Sites host using gemini-3.5-flash-lite and a server-side secret from the Gilded Ace free-tier project. Billing was not enabled. No separate Cloudflare account is required. Local guidance handles quota or capacity failures. Live tests verified gameplay, historical evidence and calculator use; this is not an exhaustive accuracy guarantee.

Endpoint: /api/ace. Runtime: GEMINI_API_KEY (secret), GEMINI_MODEL=gemini-3.5-flash-lite, ALLOWED_ORIGIN=the published origin. The per-isolate limiter is not a global quota. Keep billing disabled for free-only operation. See ../dist/evidence/GEMINI_SETUP.md.

Ace retrieves reviewed evidence or runs a read-only simulator. It cannot purchase, change model data, or modify player saves. Generation errors fall back to local guidance. Questions are capped at 400 characters, requests at 16 KB, and tool rounds at three. This does not guarantee factual perfection or prevent public quota exhaustion.
