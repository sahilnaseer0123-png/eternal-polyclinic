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

`https://eternal-polyclinic.pages.dev/book?doctor=akash` opens the booking form with Dr. Akash chosen.

## Logo files

The `brand/` folder has the clinic logo for print and social media: `logo.svg` (any size),
`logo-2048.png` (transparent), `logo-2048-white.png`, and horizontal lockups with the name
for light and dark backgrounds.

## Deploy

Push to GitHub. Cloudflare Pages builds `main` (`npx next build`, output `out/`) and deploys it automatically.
