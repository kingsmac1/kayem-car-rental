-- =============================================================================
-- Rental OS — Supabase database schema
-- Paste into Supabase → SQL Editor → Run. (Not run automatically.)
-- Mirrors the mock data in src/mocks/types.ts so services can switch over 1:1.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist"; -- for the double-booking exclusion constraint

-- ---------------------------------------------------------------- enums
create type staff_role as enum ('Owner', 'Manager', 'Front Desk', 'Fleet Officer');
create type car_category as enum ('Saloon', 'SUV', 'Luxury Saloon', 'Luxury SUV', 'Van', 'Bus');
create type car_status as enum ('available', 'rented', 'maintenance', 'blocked');
create type drive_mode as enum ('self-drive', 'chauffeur');
create type booking_status as enum ('pending', 'confirmed', 'active', 'returned', 'closed', 'cancelled');
create type deposit_status as enum ('pending', 'held', 'refunded', 'deducted');
create type booking_channel as enum ('website', 'whatsapp', 'walk-in', 'corporate', 'phone');
create type verification_status as enum ('verified', 'review', 'failed', 'none');
create type risk_level as enum ('low', 'medium', 'high');
create type doc_type as enum ('Vehicle licence', 'Insurance', 'Roadworthiness', 'Proof of ownership');
create type conversation_status as enum ('bot', 'needs-human', 'human', 'closed');
create type message_sender as enum ('customer', 'bot', 'agent');

-- ---------------------------------------------------------------- people
create table staff (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  role staff_role not null default 'Front Desk',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table corporate_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('Company', 'Embassy', 'Hotel', 'Event planner', 'Other')),
  city text not null,
  contact_name text,
  email text,
  credit_limit numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  discount numeric(5,4) not null default 0.10,
  created_at timestamptz not null default now()
);

create table corporate_bookers (
  id uuid primary key default gen_random_uuid(),
  corporate_id uuid not null references corporate_accounts(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  role text not null default 'Booker' check (role in ('Admin', 'Booker')),
  unique (corporate_id, email)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  email text not null unique,
  city text,
  corporate_id uuid references corporate_accounts(id) on delete set null,
  -- Verification RESULTS only. Never store the raw NIN or the selfie image.
  verification verification_status not null default 'none',
  nin_result text check (nin_result in ('match', 'mismatch', 'pending')),
  licence_result text check (licence_result in ('valid', 'expired', 'pending')),
  selfie_score smallint check (selfie_score between 0 and 100),
  verification_ref text,           -- provider reference (e.g. Dojah reference id)
  verified_at timestamptz,
  risk risk_level not null default 'low',
  risk_flags text[] not null default '{}',
  blacklisted boolean not null default false,
  blacklist_reason text,
  blacklisted_by uuid references staff(id),
  blacklisted_at timestamptz,
  referral_code text unique,
  referred_by uuid references customers(id),
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  staff_id uuid references staff(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table partner_owners (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  email text not null,
  city text not null,
  commission numeric(5,4) not null default 0.25,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paused')),
  pending_car jsonb,              -- {make, model, year} from the website application
  created_at timestamptz not null default now()
);

create table chauffeurs (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  city text not null,
  languages text[] not null default '{English}',
  years_experience smallint,
  licence_expiry date,
  rating numeric(2,1) not null default 5.0,
  trips integer not null default 0,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- fleet
create table locations (
  id text primary key,            -- e.g. 'los-intl'
  city text not null,
  name text not null,
  kind text not null check (kind in ('airport', 'office', 'hotel', 'area')),
  lat double precision not null,
  lng double precision not null
);

create table cars (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year smallint not null,
  category car_category not null,
  city text not null,
  seats smallint not null,
  transmission text not null default 'Automatic',
  fuel text not null default 'Petrol',
  colour text,
  plate text not null unique,
  image_url text,
  gallery text[] not null default '{}',
  rate_hourly numeric(12,2) not null,
  rate_daily numeric(12,2) not null,
  rate_weekly numeric(12,2) not null,
  rate_monthly numeric(12,2) not null,
  deposit numeric(12,2) not null,
  modes drive_mode[] not null default '{self-drive,chauffeur}',
  status car_status not null default 'available',
  blocked_reason text,
  mileage integer not null default 0,
  service_every_km integer not null default 10000,
  last_service_km integer not null default 0,
  fuel_level smallint not null default 100,
  owner_partner_id uuid references partner_owners(id) on delete set null, -- null = company-owned
  tracker_device_id text unique,  -- Traccar device uniqueId
  features text[] not null default '{}',
  tagline text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table car_documents (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  type doc_type not null,
  number text,
  expires_on date not null,
  file_url text,
  unique (car_id, type)
);

create table maintenance_records (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  done_on date not null default current_date,
  kind text not null check (kind in ('Service', 'Repair', 'Tyres', 'Body work', 'Inspection')),
  description text not null,
  odometer_km integer,
  cost numeric(12,2) not null default 0,
  vendor text,
  staff_id uuid references staff(id)
);

-- A car is bookable only if documents are valid and service isn't overdue.
create or replace view car_bookability as
select c.id as car_id,
  (c.status in ('available', 'rented')
   and not exists (select 1 from car_documents d where d.car_id = c.id and d.expires_on < current_date)
   and (c.mileage - c.last_service_km) <= c.service_every_km) as bookable
from cars c;

-- ---------------------------------------------------------------- bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,       -- EMK-4123
  car_id uuid not null references cars(id),
  customer_id uuid not null references customers(id),
  corporate_id uuid references corporate_accounts(id),
  chauffeur_id uuid references chauffeurs(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  pickup_location text references locations(id),
  dropoff_location text references locations(id),
  flight_number text,
  mode drive_mode not null,
  extras text[] not null default '{}',
  status booking_status not null default 'pending',
  total numeric(12,2) not null,
  paid numeric(12,2) not null default 0,
  deposit numeric(12,2) not null default 0,
  deposit_status deposit_status not null default 'pending',
  channel booking_channel not null default 'website',
  promo_code text,
  extended_days integer not null default 0,
  rating smallint check (rating between 1 and 5),
  agreement_signed_at timestamptz,
  agreement_signature_url text,
  created_by uuid references staff(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Double-booking prevention: no two live bookings for the same car may overlap.
  constraint no_double_booking exclude using gist (
    car_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'active'))
);
create index bookings_car_time on bookings (car_id, starts_at, ends_at);
create index bookings_customer on bookings (customer_id);

create table deposit_deductions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  kind text not null check (kind in ('damage', 'fuel', 'late', 'fine', 'cleaning')),
  label text not null,
  amount numeric(12,2) not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  provider text not null default 'paystack',
  provider_ref text unique,
  method text check (method in ('card', 'transfer', 'ussd', 'cash')),
  amount numeric(12,2) not null,
  kind text not null check (kind in ('rental', 'deposit', 'extension', 'refund', 'deduction')),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now()
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  car_id uuid not null references cars(id),
  kind text not null check (kind in ('check-out', 'check-in')),
  staff_id uuid references staff(id),
  odometer_km integer not null,
  fuel_pct smallint not null,
  photos jsonb not null default '{}',   -- {front, rear, left, right, interior, dashboard: url}
  notes text,
  created_at timestamptz not null default now()
);

create table inspection_damages (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections(id) on delete cascade,
  angle text not null,
  x real, y real,
  label text not null,
  severity text check (severity in ('minor', 'moderate', 'major')),
  cost numeric(12,2),
  ai_flagged boolean not null default false,
  ai_confidence real
);

-- ---------------------------------------------------------------- pricing & marketing
create table season_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  uplift numeric(5,4) not null,
  active boolean not null default true
);

create table pricing_settings (
  id smallint primary key default 1 check (id = 1),
  weekend_uplift numeric(5,4) not null default 0.10,
  event_uplift numeric(5,4) not null default 0.20,
  same_day_premium numeric(5,4) not null default 0.10,
  corporate_discount numeric(5,4) not null default 0.12,
  loyalty_discount numeric(5,4) not null default 0.05,
  long_stay jsonb not null default '[{"minDays":7,"discount":0.08},{"minDays":14,"discount":0.12},{"minDays":28,"discount":0.2}]'
);

create table promo_codes (
  code text primary key,
  discount numeric(5,4) not null,
  uses integer not null default 0,
  max_uses integer not null default 100,
  expires_at timestamptz not null,
  active boolean not null default true
);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references customers(id),
  friend_customer_id uuid references customers(id),
  friend_name text,
  status text not null default 'signed-up' check (status in ('signed-up', 'booked', 'rewarded')),
  reward numeric(12,2) not null default 10000,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  customer_id uuid not null references customers(id),
  rating smallint check (rating between 1 and 5),
  body text,
  status text not null default 'requested' check (status in ('requested', 'reviewed', 'not-sent')),
  requested_at timestamptz not null default now()
);

create table chauffeur_payouts (
  id uuid primary key default gen_random_uuid(),
  chauffeur_id uuid not null references chauffeurs(id),
  amount numeric(12,2) not null,
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid'))
);

create table partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partner_owners(id),
  period_month date not null,
  gross numeric(12,2) not null,
  commission numeric(12,2) not null,
  net numeric(12,2) not null,
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid'))
);

-- ---------------------------------------------------------------- WhatsApp, tracking, ops
create table wa_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  phone text not null,
  display_name text,
  status conversation_status not null default 'bot',
  topic text,
  assigned_staff_id uuid references staff(id),
  updated_at timestamptz not null default now()
);

create table wa_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references wa_conversations(id) on delete cascade,
  sender message_sender not null,
  body text not null,
  card jsonb,                      -- quote / payment link / confirmation payloads
  provider_message_id text,
  created_at timestamptz not null default now()
);

create table geofences (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_km real not null,
  traccar_geofence_id integer
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('info', 'warn', 'bad')),
  kind text not null,
  car_id uuid references cars(id),
  booking_id uuid references bookings(id),
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table immobiliser_commands (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id),
  staff_id uuid not null references staff(id),
  reason text not null,
  speed_at_request real,
  status text not null check (status in ('refused-moving', 'sent', 'released')),
  created_at timestamptz not null default now()
);

create table business_settings (
  id smallint primary key default 1 check (id = 1),
  deposit_rule text,
  fuel_policy text,
  late_fee_per_hour numeric(12,2) not null default 10000,
  grace_minutes smallint not null default 59,
  min_age smallint not null default 23,
  cancellation_hours smallint not null default 24
);

create table audit_log (
  id bigserial primary key,
  staff_id uuid references staff(id),
  actor_name text not null,
  role staff_role,
  action text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helper functions for RLS
create or replace function current_staff_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from staff where auth_user_id = auth.uid() and active
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where auth_user_id = auth.uid() and active)
$$;

create or replace function has_role(roles staff_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_staff_role() = any(roles), false)
$$;

create or replace function my_customer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from customers where auth_user_id = auth.uid()
$$;

create or replace function my_corporate_id() returns uuid
language sql stable security definer set search_path = public as $$
  select corporate_id from corporate_bookers where auth_user_id = auth.uid() limit 1
$$;

create or replace function my_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from partner_owners where auth_user_id = auth.uid()
$$;

create or replace function my_chauffeur_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from chauffeurs where auth_user_id = auth.uid()
$$;

-- ---------------------------------------------------------------- row level security
alter table staff enable row level security;
alter table corporate_accounts enable row level security;
alter table corporate_bookers enable row level security;
alter table customers enable row level security;
alter table customer_notes enable row level security;
alter table partner_owners enable row level security;
alter table chauffeurs enable row level security;
alter table locations enable row level security;
alter table cars enable row level security;
alter table car_documents enable row level security;
alter table maintenance_records enable row level security;
alter table bookings enable row level security;
alter table deposit_deductions enable row level security;
alter table payments enable row level security;
alter table inspections enable row level security;
alter table inspection_damages enable row level security;
alter table season_rules enable row level security;
alter table pricing_settings enable row level security;
alter table promo_codes enable row level security;
alter table referrals enable row level security;
alter table reviews enable row level security;
alter table chauffeur_payouts enable row level security;
alter table partner_payouts enable row level security;
alter table wa_conversations enable row level security;
alter table wa_messages enable row level security;
alter table geofences enable row level security;
alter table alerts enable row level security;
alter table immobiliser_commands enable row level security;
alter table business_settings enable row level security;
alter table audit_log enable row level security;

-- Public website: anyone can read the catalogue (cars, locations, pricing rules).
create policy "public reads cars" on cars for select using (true);
create policy "public reads locations" on locations for select using (true);
create policy "public reads seasons" on season_rules for select using (true);
create policy "public reads pricing" on pricing_settings for select using (true);
create policy "public reads active promos" on promo_codes for select using (active);
create policy "public reads settings" on business_settings for select using (true);

-- Staff: full access by role.
create policy "staff all: ops tables" on bookings for all using (is_staff()) with check (is_staff());
create policy "staff all: customers" on customers for all using (has_role('{Owner,Manager,Front Desk}')) with check (has_role('{Owner,Manager,Front Desk}'));
create policy "staff all: notes" on customer_notes for all using (has_role('{Owner,Manager,Front Desk}')) with check (has_role('{Owner,Manager,Front Desk}'));
create policy "staff write cars" on cars for all using (has_role('{Owner,Manager,Fleet Officer}')) with check (has_role('{Owner,Manager,Fleet Officer}'));
create policy "staff docs" on car_documents for all using (has_role('{Owner,Manager,Fleet Officer}')) with check (has_role('{Owner,Manager,Fleet Officer}'));
create policy "staff maintenance" on maintenance_records for all using (has_role('{Owner,Manager,Fleet Officer}')) with check (has_role('{Owner,Manager,Fleet Officer}'));
create policy "staff inspections" on inspections for all using (is_staff()) with check (is_staff());
create policy "staff damages" on inspection_damages for all using (is_staff()) with check (is_staff());
create policy "staff deductions" on deposit_deductions for all using (is_staff()) with check (is_staff());
create policy "owner+manager payments" on payments for all using (has_role('{Owner,Manager}')) with check (has_role('{Owner,Manager}'));
create policy "owner+manager pricing" on season_rules for all using (has_role('{Owner,Manager}')) with check (has_role('{Owner,Manager}'));
create policy "owner+manager pricing settings" on pricing_settings for all using (has_role('{Owner,Manager}')) with check (has_role('{Owner,Manager}'));
create policy "owner+manager promos" on promo_codes for all using (has_role('{Owner,Manager}')) with check (has_role('{Owner,Manager}'));
create policy "staff referrals" on referrals for all using (has_role('{Owner,Manager}')) with check (has_role('{Owner,Manager}'));
create policy "staff reviews" on reviews for all using (is_staff()) with check (is_staff());
create policy "staff corporate" on corporate_accounts for all using (has_role('{Owner,Manager}')) with check (has_role('{Owner,Manager}'));
create policy "staff corporate bookers" on corporate_bookers for all using (has_role('{Owner,Manager}')) with check (has_role('{Owner,Manager}'));
create policy "staff partners" on partner_owners for all using (has_role('{Owner,Manager}')) with check (has_role('{Owner,Manager}'));
create policy "owner partner payouts" on partner_payouts for all using (has_role('{Owner}')) with check (has_role('{Owner}'));
create policy "staff chauffeurs" on chauffeurs for all using (has_role('{Owner,Manager,Front Desk}')) with check (has_role('{Owner,Manager,Front Desk}'));
create policy "owner chauffeur payouts" on chauffeur_payouts for all using (has_role('{Owner,Manager}')) with check (has_role('{Owner,Manager}'));
create policy "staff whatsapp" on wa_conversations for all using (has_role('{Owner,Manager,Front Desk}')) with check (has_role('{Owner,Manager,Front Desk}'));
create policy "staff whatsapp messages" on wa_messages for all using (has_role('{Owner,Manager,Front Desk}')) with check (has_role('{Owner,Manager,Front Desk}'));
create policy "fleet geofences" on geofences for all using (has_role('{Owner,Manager,Fleet Officer}')) with check (has_role('{Owner,Manager,Fleet Officer}'));
create policy "staff alerts" on alerts for all using (is_staff()) with check (is_staff());
create policy "fleet immobiliser" on immobiliser_commands for all using (has_role('{Owner,Manager,Fleet Officer}')) with check (has_role('{Owner,Manager,Fleet Officer}'));
create policy "owner settings" on business_settings for update using (has_role('{Owner}')) with check (has_role('{Owner}'));
create policy "owner staff" on staff for all using (has_role('{Owner}')) with check (has_role('{Owner}'));
create policy "staff read self" on staff for select using (auth_user_id = auth.uid());
create policy "staff read audit" on audit_log for select using (has_role('{Owner}'));
create policy "staff write audit" on audit_log for insert with check (is_staff());

-- Customers: their own profile, bookings, deductions and inspections only.
create policy "customer reads self" on customers for select using (id = my_customer_id());
create policy "customer updates self" on customers for update using (id = my_customer_id()) with check (id = my_customer_id() and not blacklisted);
create policy "customer reads own bookings" on bookings for select using (customer_id = my_customer_id());
create policy "customer creates own bookings" on bookings for insert with check (customer_id = my_customer_id() and status = 'pending');
create policy "customer reads own deductions" on deposit_deductions for select using (booking_id in (select id from bookings where customer_id = my_customer_id()));
create policy "customer reads own inspections" on inspections for select using (booking_id in (select id from bookings where customer_id = my_customer_id()));
create policy "customer reads own referrals" on referrals for select using (referrer_id = my_customer_id());

-- Corporate bookers: their company's account and trips.
create policy "corporate reads own account" on corporate_accounts for select using (id = my_corporate_id());
create policy "corporate reads own bookers" on corporate_bookers for select using (corporate_id = my_corporate_id());
create policy "corporate reads own trips" on bookings for select using (corporate_id = my_corporate_id());
create policy "corporate books trips" on bookings for insert with check (corporate_id = my_corporate_id() and channel = 'corporate');

-- Partner owners: their cars, those cars' bookings, and their payouts.
create policy "partner reads self" on partner_owners for select using (id = my_partner_id());
create policy "partner reads car bookings" on bookings for select using (car_id in (select id from cars where owner_partner_id = my_partner_id()));
create policy "partner reads payouts" on partner_payouts for select using (partner_id = my_partner_id());

-- Chauffeurs: their own profile, jobs and payouts.
create policy "chauffeur reads self" on chauffeurs for select using (id = my_chauffeur_id());
create policy "chauffeur updates availability" on chauffeurs for update using (id = my_chauffeur_id()) with check (id = my_chauffeur_id());
create policy "chauffeur reads jobs" on bookings for select using (chauffeur_id = my_chauffeur_id());
create policy "chauffeur updates job status" on bookings for update using (chauffeur_id = my_chauffeur_id()) with check (chauffeur_id = my_chauffeur_id());
create policy "chauffeur reads payouts" on chauffeur_payouts for select using (chauffeur_id = my_chauffeur_id());

-- Seed the singleton rows.
insert into pricing_settings (id) values (1) on conflict do nothing;
insert into business_settings (id, deposit_rule, fuel_policy) values (1,
  'Refundable deposit held on card or transfer. Refunded within 24 hours of a clean return; damage, fuel, fines and late fees are deducted with photo evidence.',
  'Full-to-full. Shortfall charged at ₦1,100 per litre plus ₦5,000 service fee.') on conflict do nothing;
