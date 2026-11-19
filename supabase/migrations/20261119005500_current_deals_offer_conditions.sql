create or replace view public.current_deals with (security_invoker=true) as
 SELECT id,
    title,
    original_price,
    discount_price,
    store_category,
    category,
    image_url,
    deal_url,
    published_at,
    source_feed,
    upvotes,
    coupon_code,
    external_id,
    last_seen_at,
    is_active,
    created_at,
    discount_pct,
    observed_region,
    source_url,
    promotion_ends_at,
    unit_basis,
    unit_price,
    search_document,
    offer_conditions
   FROM deals
  WHERE is_active AND source_feed <> 'seed'::text AND last_seen_at > (now() - '72:00:00'::interval) AND (promotion_ends_at IS NULL OR promotion_ends_at > now()) AND ((store_category <> ALL (ARRAY['Coles'::text, 'Woolworths'::text])) OR last_seen_at >= ((date_trunc('day'::text, (now() AT TIME ZONE 'Australia/Sydney'::text)) - ((EXTRACT(isodow FROM (now() AT TIME ZONE 'Australia/Sydney'::text))::integer + 4) % 7)::double precision * '1 day'::interval) AT TIME ZONE 'Australia/Sydney'::text));
notify pgrst, 'reload schema';
