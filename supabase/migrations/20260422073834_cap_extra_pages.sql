-- Replace the function with a plpgsql variant that only increments when under
-- the cap (10 extra pages). Returns NULL when the card is not found OR when
-- extra_pages is already at the maximum, so callers can detect the difference
-- with a follow-up lookup.
create or replace function increment_extra_pages(card_link_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  result integer;
begin
  update cards
  set extra_pages = coalesce(extra_pages, 0) + 1
  where contributor_link_id = card_link_id
    and coalesce(extra_pages, 0) < 10
  returning extra_pages into result;
  return result;
end;
$$;
