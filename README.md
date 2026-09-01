This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:


You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Eternal Polyclic

Eternal Polyclic is the operating foundation for multi-specialty medical centers. The current foundation includes a responsive landing page and a tenant-aware Prisma data contract for practice management, diagnostics, pharmacy, prescriptions, and patient access.

## Run locally

```bash
cp .env.example .env
npm run dev
```

Set `DATABASE_URL` to a PostgreSQL database before running Prisma commands:

```bash
npx prisma validate
npx prisma migrate dev --name init
```

## Project map

- `app/` - Next.js App Router UI and global Tailwind styles.
- `prisma/schema.prisma` - multi-tenant models and role/status enums.
- `prisma.config.ts` - Prisma 7 configuration and migration path.
- `.env.example` - database and authentication placeholders.

## Domain model

Every operational record is scoped to a `Clinic`. `User` supports admin, manager, doctor, technician, pharmacist, and patient roles. `DoctorAvailability` drives recurring time slots; `Appointment` covers consultations and diagnostic bookings; `DiagnosticTest` stores lab/imaging workflows and report links; `PharmacyItem`, `Prescription`, and `PrescriptionItem` cover inventory and medication fulfillment.

Authentication dependencies are prepared with NextAuth and can be connected to the `externalAuthId` field when the provider strategy is selected.
