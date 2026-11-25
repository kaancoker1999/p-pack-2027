-- Istanbul 2027 — veritabanı şeması (kayıt listesi)
-- Supabase > SQL Editor'e yapıştırıp çalıştırın. Tekrar çalıştırmak güvenlidir.

create table if not exists registrations (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  phone       text not null unique,          -- +905321234567 biçiminde; aynı numara iki kez kaydolamaz
  invited_by  text not null,                 -- referans kişisi (organizatör adı)
  locale      text not null default 'tr' check (locale in ('tr', 'en')),
  created_at  timestamptz not null default now()
);
create index if not exists registrations_created_idx on registrations (created_at desc);
create index if not exists registrations_inviter_idx on registrations (invited_by);

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

-- Uygulama veritabanına sunucudan (DATABASE_URL) bağlanır. RLS'i açıp hiç policy
-- yazmayarak tabloları Supabase'in herkese açık (anon) API'sine tamamen kapatıyoruz.
alter table registrations enable row level security;
alter table audit_log     enable row level security;
alter table rate_limits   enable row level security;

-- @supabase-only (yerel geliştirme veritabanı bu satırdan sonrasını atlar)
-- Bilet satışlı eski sürümden kalan, artık kullanılmayan tablolar. İçleri boşsa
-- aşağıdaki iki satırın başındaki "--" işaretini silip çalıştırarak kaldırabilirsiniz.
-- drop table if exists tickets;
-- drop table if exists orders;
