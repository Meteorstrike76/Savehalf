begin;
alter table public.community_feeds drop constraint community_feeds_feed_key_check;
alter table public.community_feeds add constraint community_feeds_feed_key_check check(feed_key in ('frontpage','coles','woolworths','priceline','chemistwarehouse','iga','officeworks','adorebeauty','sephora','mcdonalds','kfc','hungryjacks','dominos','subway'));
commit;
