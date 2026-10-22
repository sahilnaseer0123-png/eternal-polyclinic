# Eternal Polyclinic website

Booking website for Eternal Polyclinic, Opposite SDH Hospital, Sopore.

## Run it on your computer

```bash
npm install     # first time only
npm run dev     # then open http://localhost:3000
npm test        # schedule and booking checks
```

## Change clinic details

Edit `data/clinic.ts`. Doctors, OPD days, services, hours, phone and fee are all there.

## Share a booking link for one doctor

`https://eternal-polyclinic.vercel.app/book?doctor=akash` opens the booking form with Dr. Akash chosen.

## Deploy

Push to GitHub. Vercel builds and deploys every push to `main` automatically.
