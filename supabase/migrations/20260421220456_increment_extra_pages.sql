create or replace function increment_extra_pages(card_link_id text)
returns integer
language sql
security definer
set search_path = public
as $$
  update cards
  set extra_pages = coalesce(extra_pages, 0) + 1
  where contributor_link_id = card_link_id
  returning extra_pages;
$$;
