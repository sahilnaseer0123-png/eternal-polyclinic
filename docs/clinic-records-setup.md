# Clinic records: one-time setup

The patient database, lab reports, staff logins, WhatsApp log and statistics need one Cloudflare D1
database. Until it is connected, the website and the old PIN reception desk keep working exactly as before,
and the dashboard shows a "Setup needed" card.

## 1. Create the database (Cloudflare dashboard, 2 minutes)

1. Cloudflare dashboard → **Storage & Databases → D1 SQL Database → Create**.
2. Name: `eternal-polyclinic-records`. Location: **Asia-Pacific**. Create.
3. Copy the **Database ID** shown on the next page.

D1's free plan (5 GB) is far more than the clinic needs. No card required.

## 2. Connect it to the website

This project configures bindings in `wrangler.toml`, so the dashboard's binding screen is locked;
add these lines to `wrangler.toml` (replace the id) and push to `main`:

```toml
[[d1_databases]]
binding = "EP_SQL"
database_name = "eternal-polyclinic-records"
database_id = "PASTE-THE-DATABASE-ID-HERE"
```

The binding MUST be called `EP_SQL`, not `EP_DB`: `EP_DB` would switch the whole OPD register to the
new database and hide every appointment already saved.

Tables are created automatically on first use. The first time reception opens the dashboard,
every appointment already in the register is copied into the patient database (once; no WhatsApp
messages are sent for old appointments).

## 3. Switch on staff logins

1. Open `/admin`, unlock with the current PIN.
2. The card "Switch on staff logins" appears: enter the PIN again, your name, a username and password.
3. The shared PIN stops working immediately. Add reception and lab logins under **Staff**.

Roles:
- **Owner**: everything, including staff accounts and owner reports.
- **Reception**: patients, appointments, doctors, availability, WhatsApp log, statistics.
- **Lab**: lab reports only (plus patient lookup to file a report).

Forgotten password: the owner resets it under Staff. Forgotten owner password with no second owner:
someone with Cloudflare access has to reset it in D1 (create a second owner account early to avoid this).

## 4. Lab report storage

Report PDFs are stored privately in the existing KV namespace (`EP_KV`, keys `lab-pdf:*`), up to 10 MB each.
KV's free plan holds about 1 GB (roughly 5,000 typical reports) and allows 1,000 writes a day, shared with the OPD
register. If the clinic outgrows that, move PDFs to R2 (needs a card on file in Cloudflare even on the free plan).

## 5. WhatsApp

See `docs/whatsapp-setup.md`. Without it everything works, but messages are logged as **Failed: WhatsApp
Business API is not connected yet** and can be retried from the dashboard once it's set up.
