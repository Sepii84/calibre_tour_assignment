import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    await prisma.rate.createMany({
        data: [
            { 
                seasonId: lowSeason.id, 
                roomId: STDroom.id, 
                boardTypeCode: "BB", 
                adults: 2, 
                children: 0, 
                price: 90 
            },
            { 
                seasonId: highSeason.id, 
                roomId: STDroom.id, 
                boardTypeCode: "BB", 
                adults: 1, 
                children: 0, 
                price: 110 
            },
            { 
                seasonId: highSeason.id, 
                roomId: STDroom.id, 
                boardTypeCode: "BB", 
                adults: 2, 
                children: 0, 
                price: 130 
            },
            { 
                seasonId: highSeason.id, 
                roomId: STDroom.id, 
                boardTypeCode: "BB", 
                adults: 2, 
                children: 1, 
                price: 150 
            },
            { 
                seasonId: highSeason.id, 
                roomId: STDroom.id, 
                boardTypeCode: "HB", 
                adults: 2, 
                children: 0, 
                price: 165 
            },
            { 
                seasonId: highSeason.id, 
                roomId: FAMroom.id, 
                boardTypeCode: "BB", 
                adults: 2, 
                children: 2, 
                price: 210 
            },
        ]
    });
}

main()
    .catch(console.error) 
    .finally(async () => {
        await prisma.$disconnect();
    }
);
    
