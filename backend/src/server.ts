import express from "express";
import cors from "cors";
import { PrismaClient, type Season, type Room, type Rate, type Contract} from "@prisma/client";

const prisma = new PrismaClient();

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
            include: { rates: { include: { boardType: true, season: true } } },
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

function calculateNights(checkIn: Date, checkOut: Date): number {
  const millisecondsDifference = checkOut.getTime() - checkIn.getTime();
  return millisecondsDifference / (1000 * 60 * 60 * 24);
}

function isValidBoardType(boardType: string): boolean {
    const validBoardTypes = ["BB", "HB"];
    return validBoardTypes.includes(boardType);
}

function findSeasonForStay(
  seasons: Season[],
  checkIn: Date,
  checkOut: Date
): Season | undefined {
  return seasons.find(season =>
    checkIn >= season.startDate &&
    checkOut <= season.endDate
  );
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
    const season = findSeasonForStay(seasons, checkIn, checkOut);
    if (!season) {
        return [];
    }
    const nights = calculateNights(checkIn, checkOut);
    return rooms
        .filter(room => roomFitsGuests(room, adults, children))
        .filter(room => findExactRate(rates, season.id, room.id, boardCode, adults, children) !== undefined)
        .map(room => { 
                const rate = findExactRate(rates, season.id, room.id, boardCode, adults, children);
                return {
                    roomId: room.id,
                    roomCode: room.code, 
                    roomName: room.name, 
                    boardTypeCode: boardCode,
                    currency: contracts.find(contract => contract.id === season.contractId)!.currency,
                    nightlyPrice: rate!.price, 
                    nights, 
                    totalPrice: rate!.price * nights
                };
            });
}

app.get("/availability", async (req, res) => {
    
    try {
        const { checkIn, checkOut, boardType, adults, children } = req.query;

        if (!checkIn || !checkOut || !boardType || adults === undefined || children === undefined) {
            res.status(400).json({ error: "Missing query parameters" });
            return;
        }

        const adultsNum = Number(adults);
        const childrenNum = Number(children);
        const checkInDate = parseDate(checkIn as string);
        const checkOutDate = parseDate(checkOut as string);

        if (
            Number.isNaN(adultsNum) || 
            Number.isNaN(childrenNum) || 
            !Number.isInteger(adultsNum) ||
            !Number.isInteger(childrenNum) ||
            !checkInDate || 
            !checkOutDate || 
            !isValidBoardType(boardType as string) || 
            adultsNum <= 0 || 
            childrenNum < 0 || 
            checkInDate >= checkOutDate
        ) {
            res.status(400).json({ error: "Invalid query parameters" });
            return;
        }

        const results = await searchAvailableRoomsWithPrice(
            await prisma.room.findMany(),
            await prisma.rate.findMany(),
            await prisma.season.findMany(),
            await prisma.contract.findMany(),
            checkInDate,
            checkOutDate,
            boardType as string,
            adultsNum,
            childrenNum
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