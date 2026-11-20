-- P-PACK 2027 — veritabanı şeması
-- Supabase > SQL Editor'e yapıştırıp çalıştırın. Tekrar çalıştırmak güvenlidir.

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique,
  buyer_name    text not null,
  buyer_email   text,                       -- artık kullanılmıyor (e-posta toplanmıyor)
  invited_by    text,                       -- "Kim davet etti?" (organizatör adı)
  quantity      integer not null check (quantity > 0),
  unit_price    integer not null check (unit_price >= 0),
  currency      text not null check (currency in ('TRY', 'EUR')),
  total         integer not null check (total >= 0),
  price_tier    text not null,
  status        text not null default 'PAYMENT_SUBMITTED'
                check (status in ('PAYMENT_SUBMITTED', 'PAID', 'REJECTED')),
  receipt_url   text,                       -- Storage içindeki dosya yolu (bucket özeldir)
  guests        jsonb not null,             -- [{name}] — onayda biletlere dönüşür
  locale        text not null default 'tr' check (locale in ('tr', 'en')),
  submitted_at  timestamptz not null default now(),
  approved_at   timestamptz,
  approved_by   text,
  reject_reason text
);
create index if not exists orders_status_idx on orders (status, submitted_at desc);

create table if not exists tickets (
  id              text primary key,         -- 128 bit rastgele (32 hex)
  order_id        uuid references orders (id) on delete restrict,  -- davetli biletlerinde null
  guest_name      text not null,
  guest_email     text,                     -- artık kullanılmıyor
  guest_instagram text,                     -- artık kullanılmıyor
  invited_by      text,
  signature       text not null,            -- HMAC-SHA256(TICKET_SECRET, id)
  status          text not null default 'VALID' check (status in ('VALID', 'USED', 'CANCELLED')),
  checked_in_at   timestamptz,
  replaced_by     text references tickets (id),
  locale          text not null default 'tr' check (locale in ('tr', 'en')),
  created_at      timestamptz not null default now()
);
create index if not exists tickets_order_idx on tickets (order_id);
create index if not exists tickets_status_idx on tickets (status);

create table if not exists audit_log (
  id         bigint generated always as identity primary key,
  admin      text not null,
  action     text not null,
  target_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log (created_at desc);

-- Form / giriş denemesi sınırlaması için sayaçlar
create table if not exists rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 1,
  primary key (key, window_start)
);

-- Önceki sürümle kurulmuş veritabanları için (tekrar çalıştırmak güvenlidir)
alter table orders  add column if not exists invited_by text;
alter table tickets add column if not exists invited_by text;
alter table orders  alter column buyer_email drop not null;
alter table tickets alter column guest_email drop not null;
alter table tickets alter column guest_instagram drop not null;

-- Uygulama veritabanına sunucudan (DATABASE_URL) bağlanır. RLS'i açıp hiç policy
-- yazmayarak tabloları Supabase'in herkese açık (anon) API'sine tamamen kapatıyoruz.
alter table orders      enable row level security;
alter table tickets     enable row level security;
alter table audit_log   enable row level security;
alter table rate_limits enable row level security;

-- @supabase-only (yerel geliştirme veritabanı bu satırdan sonrasını atlar)
-- Dekontlar için ÖZEL bucket (yalnızca service role erişir)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;
