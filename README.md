# Calibre Tour Junior Developer Technical Assignment

Hotel contract and availability task built with:

- Backend: Node.js, Express.js, TypeScript
- Database: PostgreSQL, Prisma
- Frontend: Next.js, TypeScript
- Package manager: pnpm

The app allows a user to search hotel room availability by check-in date, check-out date, board type, number of adults, and number of children. It returns rooms that fit the requested guest mix and have an exact matching rate.

## Features

### Core features

- PostgreSQL database modeled with Prisma
- Hotel, room, board type, contract, season, and rate models
- Room limits for adults and children
- Occupancy matrix stored as rate rows
- Exact rate matching by:
  - season
  - room
  - board type
  - adults
  - children
- No fallback pricing when an exact rate does not exist
- REST API with:
  - `GET /hotels`
  - `GET /rooms/:id`
  - `GET /availability`
- Next.js frontend search page
- Clear no-results and error messages
- Bad input handling

### Bonus features implemented

- Expanded generated rate matrix in the seed script
- Zod validation for availability query parameters
- Cross-season pricing, calculated night by night
- Root development script to run frontend and backend together

## Project structure

```txt
calibre_tour_assignment/
  backend/
    prisma/
      schema.prisma
      seed.ts
      migrations/
    src/
      server.ts
    package.json
  frontend/
    src/
      app/
        page.tsx
        page.module.css
    package.json
  package.json
  README.md
```

## Requirements

Make sure these are installed:

- Node.js
- pnpm
- PostgreSQL

## Database setup

1. Create a PostgreSQL database named:

```txt
calibre_tour
```

Example using PostgreSQL:

```sql
CREATE DATABASE calibre_tour;
```

2. Then create a `.env` file inside the `backend` folder:

```txt
backend/.env
```

3. Add your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/calibre_tour?schema=public"
```

Replace `YOUR_PASSWORD` with your local PostgreSQL password.

## Install dependencies

4. From the project root:

```bash
pnpm install
```

5. Then install backend and frontend dependencies if needed:

```bash
cd backend
pnpm install

cd ../frontend
pnpm install
```

## Run database migration

6. From the backend folder:

```bash
cd backend
pnpm prisma migrate dev
```

This creates the database tables from the Prisma schema.

## Seed the database

7. From the backend folder:

```bash
pnpm seed
```

The seed script creates:

- Sunrise Hotel in Antalya
- BB and HB board types
- Standard Double room
- Family Room
- Summer 2026 contract
- Low Season
- High Season
- Generated occupancy matrix rates

The seed script generates an expanded occupancy-rate matrix for the sample rooms, seasons, and board types. The 1 adult + 1 child guest mix is intentionally left without rates to demonstrate the business rule that a room is only available when an exact rate exists. Even if a room can physically fit the guests, it should not be returned unless there is a matching rate row.

## Run the app

### Option 1: run backend and frontend together

From the project root:

```bash
pnpm dev
```

Backend runs on:

```txt
http://localhost:3001
```

Frontend runs on:

```txt
http://localhost:3000
```

### Option 2: run separately

Backend:

```bash
cd backend
pnpm dev
```

Frontend:

```bash
cd frontend
pnpm dev
```

## API endpoints

### Health check

```http
GET /health
```

Example:

```txt
http://localhost:3001/health
```

### Get hotels with rooms

```http
GET /hotels
```

Example:

```txt
http://localhost:3001/hotels
```

### Get one room

```http
GET /rooms/:id
```

Example:

```txt
http://localhost:3001/rooms/1
```

Note: after reseeding, PostgreSQL may continue auto-increment IDs, so room ID `1` may not always exist. Use `GET /hotels` first to see the current room IDs.

### Search availability

```http
GET /availability
```

Query parameters:

```txt
checkIn
checkOut
boardType
adults
children
```

Example:

```txt
http://localhost:3001/availability?checkIn=2026-06-20&checkOut=2026-06-24&boardType=BB&adults=2&children=0
```

Expected result includes:

```txt
room: STD
nights: 4
totalPrice: 520

room: FAM
nights: 4
total price: 680
```

The Family Room appears here because the seed script generates an expanded rate matrix, so it also has a valid rate for this guest mix.

## Example test cases

### Same-season search

```txt
checkIn: 2026-06-20
checkOut: 2026-06-24
boardType: BB
adults: 2
children: 0
```

Expected:

```txt
Standard Double
4 nights
130 EUR average/night
520 EUR total

Family Room
4 nights
170 EUR average/night
680 EUR total
```

### Missing exact rate

```txt
checkIn: 2026-06-20
checkOut: 2026-06-24
boardType: BB
adults: 1
children: 1
```

Expected:

```txt
No available rooms
```

This is intentional. Even if a room can physically fit the guests, it is not returned unless an exact rate exists.

### Bonus 1: Cross-season pricing bonus

```txt
checkIn: 2026-06-14
checkOut: 2026-06-18
boardType: BB
adults: 2
children: 0
```

This crosses Low Season and High Season.

Expected Standard Double pricing:

```txt
2026-06-14: Low Season  = 90 EUR
2026-06-15: Low Season  = 90 EUR
2026-06-16: High Season = 130 EUR
2026-06-17: High Season = 130 EUR

Total = 440 EUR
Average nightly price = 110 EUR
```

Expected Family Room pricing:

```txt
2026-06-14: Low Season  = 130 EUR
2026-06-15: Low Season  = 130 EUR
2026-06-16: High Season = 170 EUR
2026-06-17: High Season = 170 EUR

Total = 600 EUR
Average nightly price = 150 EUR
```

## Bonus 2: Validation

The backend uses Zod to validate availability search query parameters.

Invalid examples return `400 Invalid query parameters`:

- unsupported board type, such as `AI`
- non-number adults, such as `hello`
- children below `0`
- adults below `1`
- check-out date on or before check-in date

## Build and checks

Backend TypeScript check:

```bash
cd backend
pnpm exec tsc --noEmit
```

Prisma validation:

```bash
pnpm prisma validate
pnpm prisma migrate status
```

Frontend build:

```bash
cd frontend
pnpm build
```

## Frontend note

- The frontend is a single search page connected to the /availability endpoint. The /hotels and /rooms/:id endpoints are available through the backend API and can be tested directly, but they do not have separate frontend pages in this version.

## Assumptions

- The seed data uses one sample hotel: Sunrise Hotel in Antalya.
- Board types are limited to BB and HB.
- Prices are generated from a simple demo formula in the seed script.
- One guest mix, `1 adult + 1 child`, is intentionally left without rates to demonstrate missing-rate behavior.
- A room is only available when an exact rate exists for the requested season, room, board type, adults, and children.
- Cross-season stays are priced night by night.
- The frontend displays average nightly price for cross-season stays.
- There is no booking or allotment persistence in this version.

## What I would add with more time

- Reservation table and Book button
- Room allotment per season
- Persisted booking flow that lowers remaining allotment
- Child age groups with age-based pricing rules
- Automated tests for API routes and pricing edge cases
- More detailed frontend display for nightly price breakdown
