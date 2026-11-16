# Catalogue recovery ladder

16 November 2026, Australia/Sydney. Success means a fresh, grounded live pilot
passes acceptance and a staged deployment serves that exact accepted feed.
A passing unit test, HTTP status alone, or a completed job is not success.

## Ordered contingencies

| Path | Trigger and work | Test / exit condition |
|---|---|---|
| A: identify response | One diagnostic check of the already admitted listing; retain only allowlisted WAF markers, status and byte counts | Confirmed challenge distinguished from generic 202; no cookies/tokens/body logged |
| B: supported source access | Confirmed verification/access failure; existing permission contact supplies supported authentication/access or documented feed | Same honest client receives usable robots/listing/feed content within source terms |
| C: provider-pushed catalogue files | Source cannot support pull access but can deliver licensed files to an owner-controlled location | Validate MIME/signature/hash, retailer/region/edition/dates, bounded extraction and provenance; reject unknown origin |
| D: independently admitted feed | B/C unavailable; evaluate an already approved provider or retailer-authorised feed | Document scope and attribution; preserve separate provider identities; test actual current offers before switching |
| E: transient outage | Timeout/DNS/transport/5xx without challenge evidence | At most one retry within the original request/byte/time caps, then pause; Retry-After/rate-limit responses require waiting/review |
| F: content/parser drift | Usable permitted response, malformed or ambiguous offers | Save permitted redacted fixture, reproduce failure, fix and pass regression tests; quarantine uncertain prices |
| G: no current replacement | All admitted live paths unavailable or previous offers expire | Hide expired offers, retain permitted catalogue links and honest empty state; do not fabricate coverage |

Paths B-D depend on actual supported access or supplied files/feed; do not guess
private endpoints or silently activate another provider. The access request draft
is prepared, but no third-party message has been authorised or sent.

## Testing and stop rules

1. Run offline tests first: ordinary 200, empty 200, 202 with/without challenge
   marker, captcha marker, robots denial, 304 cache, 429, timeout, 5xx, expiry,
   old-feed replay, wrong region and invalid provenance.
2. A confirmed verification challenge stops source requests. No browser-token
   harvesting, proxy/IP rotation, spoofing, challenge solver or ignored robots.
3. Retry a stopped source only after a meaningful access/configuration change,
   rather than creating indefinite scheduled retry traffic.
4. One source-supported live pilot: Coles/Woolworths, 20 requests / 40 MB,
   2 viewers / 2 new images / 2 specials pages. Publishing stays disabled.
5. Inspect accepted current-run feed, actual request/byte/time counts, dates,
   region caveats and advertisement wording. Then stage the existing project,
   compare served feed with the accepted artifact and promote the tested build.
6. On failed acceptance/deploy comparison, retain evidence and keep publication
   off. Roll back application changes only to a still-valid reviewed release;
   never revive expired offers.

## Implementation in this change

`recovery.py` emits fixed recovery recommendations; it performs no requests,
retries, source switching or publishing. The collector retains only recognised
`x-amzn-waf-action` / `cf-mitigated` markers and classifies an explicit marker as
`verification_required`. HTTP 202 without that evidence remains `upstream`.
Existing job and publication gates remain in force.

Offline validation: 97 catalogue tests passed. Live diagnostic outcome is recorded
in the PR; no new catalogue feed is published by this change.

References:
- AWS documented challenge response: https://docs.aws.amazon.com/waf/latest/APIReference/API_ChallengeAction.html
- Similar Crawlee misclassification: https://github.com/apify/crawlee/issues/4183
- Discourse's response-handling resolution: https://meta.discourse.org/t/fetch-response-rejects-http-202-breaking-imdb-oneboxes/407725
