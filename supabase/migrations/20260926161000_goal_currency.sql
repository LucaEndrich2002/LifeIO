-- Keep the currency explicit on each persisted monetary record.
alter table public.goal_rates add column currency text not null default 'EUR' check (currency = 'EUR');
alter table public.goal_contributions add column currency text not null default 'EUR' check (currency = 'EUR');
