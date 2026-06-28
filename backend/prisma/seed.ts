import { PrismaClient, Prisma, type BoardType, type Room, type Season } from "@prisma/client";

const prisma = new PrismaClient();

function generateRatesForRoom(room: Room, seasons: Season[], boardTypes: BoardType[]): Prisma.RateCreateManyInput[] {
    const rates: Prisma.RateCreateManyInput[] = [];
    for (const season of seasons) {
        for (const boardType of boardTypes) {
            for (let adults = 1; adults <= room.maxAdults; adults++) {
                for (let children = 0; children <= room.maxChildren; children++) {
                    if (adults === 1 && children == 1) {
                        continue
                    }
                    let price: number = 0;
                    if (boardType.code === "BB") {
                        price = room.code === "STD" ? 90 + (adults + children) * 20 : 130 + (adults + children) * 20;
                    }
                    else {
                        price = room.code === "STD" ? 125 + (adults + children) * 20 : 165 + (adults + children) * 20;
                    }
                    if (season.name === "Low Season") {
                        price -= 40;
                    }
                    rates.push({
                        seasonId: season.id,
                        roomId: room.id,
                        boardTypeCode: boardType.code,
                        adults,
                        children,
                        price
                    });
                }
            }
        }
    }
    return rates;
}

async function main() {

    await prisma.rate.deleteMany();
    await prisma.season.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.room.deleteMany();
    await prisma.boardType.deleteMany();
    await prisma.hotel.deleteMany();

    const hotel = await prisma.hotel.create({
        data: {
            name: "Sunrise Hotel",
            city: "Antalya"
        }
    });
    await prisma.boardType.createMany({
        data: [
            { 
                code: "BB", 
                name: "Bed and Breakfast" 
            },
            { 
                code: "HB", 
                name: "Half Board" 
            },        
        ]
    });
    const STDroom = await prisma.room.create({
        data: {
            hotelId: hotel.id, 
            code: "STD", 
            name: "Standard Double",
            maxAdults: 2, 
            maxChildren: 1 
        },
    });
    const FAMroom = await prisma.room.create({
        data: {
            hotelId: hotel.id, 
            code: "FAM", 
            name: "Family Room", 
            maxAdults: 3, 
            maxChildren: 2 
        }
    });
    const contract = await prisma.contract.create({
        data: { 
            hotelId: hotel.id, 
            name: "Summer 2026", 
            currency: "EUR" 
        },
        
    });
    const lowSeason = await prisma.season.create({
        data: {
            contractId: contract.id,
            name: "Low Season",
            startDate: new Date("2026-05-01T00:00:00.000Z"),
            endDate: new Date("2026-06-15T00:00:00.000Z")
        }
    });
    const highSeason = await prisma.season.create({
        data: {
            contractId: contract.id,
            name: "High Season",
            startDate: new Date("2026-06-16T00:00:00.000Z"),
            endDate: new Date("2026-09-15T00:00:00.000Z")
        }
    });
    const seasons = [lowSeason, highSeason]
    const boardTypes = await prisma.boardType.findMany();
    await prisma.rate.createMany({
        data: [
            ...generateRatesForRoom(STDroom, seasons, boardTypes),
            ...generateRatesForRoom(FAMroom, seasons, boardTypes),
        ]
    });
}

main()
    .catch(console.error) 
    .finally(async () => {
        await prisma.$disconnect();
    }
);
    
