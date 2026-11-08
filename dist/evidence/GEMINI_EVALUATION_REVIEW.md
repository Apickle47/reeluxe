# Gemini evaluation — November 8, 2026

## What changed because testing found problems

The initial rehearsal implementation returned correct calculator data, but free-form narration sometimes misstated costs, contradicted itself or exceeded the requested length. Eight rehearsal requests completed; four later evidence requests failed without recorded provider status. We do not label that initial run a success or assume its failures were billing problems.

The revised implementation requires Gemini to choose an actually tested plan with an allowed reason. A loss-making choice cannot claim more profit; lower happiness cannot be labeled higher happiness. Invalid decisions get one correction attempt and then fall back. Financial narration is rendered deterministically from the verified result. Gemini provides planning and choice, not unverified financial arithmetic.

## Current automated coverage

155 application checks pass. The 28 new rehearsal tests include 150 different seeded floors, independently comparing sampled results with actual game shifts, upfront costs, excluded bonuses, no mutation, unaffordable choices, full floors, duplicate calls, invalid plans, unsupported reasons, bounded retries, malformed JSON, 429 and 503 responses. API calls in unit tests are mocked.

## Current live evaluation

GEMINI_REHEARSAL_EVALUATION.json records twelve requests to gemini-3.5-flash-lite: eight rehearsal cases and four evidence questions. All returned HTTP 200 tool cycles and passed structural checks for unchanged state, feasible choices, checked arithmetic and required evidence. Cases include broken machines, zero cash, full floor, weekend, guest happiness, no upfront spending and an instruction to reveal secrets/change the save.

Manual review still found an evidence answer asserting that customer switching occurred. That was not measured. The evidence packet and prompt were corrected; GEMINI_CAUSAL_RECHECK.json records a successful targeted live recheck explicitly saying it was not measured and did not prove added profit. Thus twelve successful requests do not mean twelve perfectly grounded initial answers.

Examples: an opening-night Fancy menu earned $38 more on average but reduced happiness and lost to baseline in 3/24 rehearsals; a broken-floor repair improved the simulated outcome; a full floor led to marketing rather than an unavailable purchase. These are fictional scenario results, not population estimates or 24 consecutive nights.

## Limits

This is a small, developer-selected suite, not an independent benchmark, statistical accuracy estimate or adversarial certification. The live suite was paced to avoid overwhelming free quotas. Latency and access can change. General chat and findings answers still use generated prose and may err despite retrieval. Rehearsal planning is bounded to a few single-change ideas, so Ace does not find a globally optimal strategy. Later nights and guest retention are not simulated.

The original May–June analytical holdout and historical data were not refit. No billing upgrade or paid fallback was introduced.
