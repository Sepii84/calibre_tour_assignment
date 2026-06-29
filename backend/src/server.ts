import express from "express";
import cors from "cors";
import { PrismaClient, type Season, type Room, type Rate, type Contract } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const availabilityQuerySchema = z.object({
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
    boardType: z.enum(["BB", "HB"]),
    adults: z.coerce.number().int().min(1),
    children: z.coerce.number().int().min(0),
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => { 
    res.json({ "status": "ok" }); 
});

app.get("/hotels", async (_req, res) => {
    try {
        const hotels = await prisma.hotel.findMany({
            include: { 
                rooms: true 
            }
        });
        res.json(hotels);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch hotels" });
    }
});

app.get("/rooms/:id", async (req, res) => {
    const roomId = Number(req.params.id);
    if (Number.isNaN(roomId)) {
        res.status(400).json({ error: "Invalid room ID" });
        return;
    }
    try {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { rates: true },
        });
        if (!room) {
            res.status(404).json({ error: "Room not found" });
            return;
        }
        res.json(room);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch room" });
    }
});

interface AvailableRoomWithPrice {
    roomId: number;
    roomCode: string;
    roomName: string;
    boardTypeCode: string;
    currency: string;
    nightlyPrice: number;
    nights: number;
    totalPrice: number;
}

function parseDate(dateString: string): Date | null {
    const date = new Date(dateString + "T00:00:00.000Z");
    return Number.isNaN(date.getTime()) ? null : date;
}

function roomFitsGuests(
    room: Room, 
    adults: number, 
    children: number
): boolean {
    return (
        adults > 0 && 
        children >= 0 && 
        adults <= room.maxAdults && 
        children <= room.maxChildren
    );
}

function findExactRate(
    rates: Rate[], 
    seasonId: number,
    roomId: number, 
    boardCode: string, 
    adults: number, 
    children: number
): Rate | undefined {
    return rates.find(
        rate => 
            rate.roomId === roomId && 
            rate.boardTypeCode === boardCode && 
            rate.adults === adults && 
            rate.children === children &&
            rate.seasonId === seasonId
        );
}

function addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
}

function getStayNights(checkIn: Date, checkOut: Date): Date[] {
    const nights: Date[] = [];
    for (
        let current = new Date(checkIn);
        current < checkOut;
        current = addDays(current, 1)
    ) {
        nights.push(new Date(current));
    }
    return nights;
}

function findSeasonForNight(
    seasons: Season[],
    night: Date
): Season | undefined {
    return seasons.find(season =>
        night >= season.startDate &&
        night <= season.endDate
    );
}

function searchAvailableRoomsWithPrice(
  rooms: Room[],
  rates: Rate[],
  seasons: Season[],
  contracts: Contract[],
  checkIn: Date,
  checkOut: Date,
  boardCode: string,
  adults: number,
  children: number
): AvailableRoomWithPrice[] {
    const nights = getStayNights(checkIn, checkOut);

    return rooms
        .filter(room => roomFitsGuests(room, adults, children))
        .map(room => {

            let totalPrice = 0;
            let currency = "";

            for (const night of nights) {

                const season = findSeasonForNight(seasons, night);
                if (!season) { return undefined; }

                const rate = findExactRate(
                    rates,
                    season.id,
                    room.id,
                    boardCode,
                    adults,
                    children
                );
                if (!rate) { return undefined; }

                const contract = contracts.find(
                    contract => contract.id === season.contractId
                );
                if (!contract) { return undefined; }
                
                totalPrice += rate.price;
                currency = contract.currency;
            }
            return {
                roomId: room.id,
                roomCode: room.code,
                roomName: room.name,
                boardTypeCode: boardCode,
                currency,
                nightlyPrice: totalPrice / nights.length,
                nights: nights.length,
                totalPrice
            };
        })
        .filter((result): result is AvailableRoomWithPrice => result !== undefined);
}

app.get("/availability", async (req, res) => {
    try {
        const parsedQuery = availabilityQuerySchema.safeParse(req.query);

        if (!parsedQuery.success) {
            res.status(400).json({ error: "Invalid query parameters" });
            return;
        }

        const { checkIn, checkOut, boardType, adults, children } = parsedQuery.data;

        const checkInDate = parseDate(checkIn);
        const checkOutDate = parseDate(checkOut);

        if (
            !checkInDate || 
            !checkOutDate || 
            checkInDate >= checkOutDate
        ) {
            res.status(400).json({ error: "Invalid query parameters" });
            return;
        }

        const rooms = await prisma.room.findMany();
        const rates = await prisma.rate.findMany();
        const seasons = await prisma.season.findMany();
        const contracts = await prisma.contract.findMany();

        const results = searchAvailableRoomsWithPrice(
            rooms,
            rates, 
            seasons,
            contracts,
            checkInDate,
            checkOutDate,
            boardType,
            adults,
            children
        );
        res.json(results);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch availability" });
    }
});

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});