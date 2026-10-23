-- Rate limiting for the public demo-email Edge Function.
-- Stores salted hashes only: no email addresses or IPs are kept.

create table demo_email_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  ip_hash text not null,
  recipient_hash text not null,
  template text not null
);
create index demo_email_log_at on demo_email_log (at);

-- No policies: only the service role (used by the Edge Function) can touch it.
alter table demo_email_log enable row level security;

-- Checks the limits and records the send in one step. Returns 'ok' or the limit hit.
-- p_count is how many emails this request sends (an enquiry also alerts the owner).
create or replace function demo_email_allow(
  p_ip text, p_recipient text, p_template text, p_count int,
  p_per_recipient int, p_per_ip int, p_daily_cap int
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - interval '24 hours';
begin
  -- Serialise concurrent requests so two can't both squeeze under a limit.
  perform pg_advisory_xact_lock(hashtext('demo_email_allow'));

  delete from demo_email_log where at < now() - interval '3 days';

  if (select count(*) from demo_email_log where at > since) + p_count > p_daily_cap then
    return 'daily demo limit reached';
  end if;
  if (select count(*) from demo_email_log where at > since and recipient_hash = p_recipient) >= p_per_recipient then
    return 'too many emails to this address today';
  end if;
  if (select count(*) from demo_email_log where at > since and ip_hash = p_ip) + p_count > p_per_ip then
    return 'too many emails from this device today';
  end if;

  insert into demo_email_log (ip_hash, recipient_hash, template)
  select p_ip, p_recipient, p_template from generate_series(1, p_count);
  return 'ok';
end;
$$;

revoke execute on function demo_email_allow(text, text, text, int, int, int, int) from public, anon, authenticated;
grant execute on function demo_email_allow(text, text, text, int, int, int, int) to service_role;
