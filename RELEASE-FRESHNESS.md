# Community freshness release — 17 October 2026

Application commit 58ce6d1. Production deployment dpl_2oHDtbsN9pmTWF6Y4qdrU31RiknR.

Radar now distinguishes a successful recent check from a delayed saved snapshot. Front page is delayed beyond 30 minutes; merchant feeds beyond 210 minutes (two healthy rotation intervals). Missing, invalid and future verification timestamps are unavailable. A visible summary flags affected feeds without additional requests. Existing expiry rules remain. Directory count derives from the 21 retailer records. Coverage copy clarifies schedules apply only to healthy collectors.

Verification: two community utility tests, three built UI scripts, typecheck, lint and production build pass. Browser confirmed the dynamic directory count. No backend deployment, scrape-budget change, authentication change or source unpause occurred.

Live audit: OzBargain paused following HTTP 403 on 16 October 02:30 UTC. Big W remains transport-failed; Coles parser review and Woolworths/Kmart/Target access review unresolved. ALDI, Best & Less and all three Cheap Eats sources have recent successful checks. Google real-account OAuth remains unverified.

Next: investigate access recovery without bypassing publisher restrictions; isolate diagnostic request paths; Sydney offer-region controls; actual OAuth end-to-end verification.
