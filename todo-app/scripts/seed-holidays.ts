import db, { holidayDB } from '../src/lib/db';

const holidays = [
    { name: "New Year's Day", date: "2024-01-01" },
    { name: "Chinese New Year", date: "2024-02-10" },
    { name: "Chinese New Year", date: "2024-02-11" },
    { name: "Good Friday", date: "2024-03-29" },
    { name: "Hari Raya Puasa", date: "2024-04-10" },
    { name: "Labour Day", date: "2024-05-01" },
    { name: "Vesak Day", date: "2024-05-22" },
    { name: "Hari Raya Haji", date: "2024-06-17" },
    { name: "National Day", date: "2024-08-09" },
    { name: "Deepavali", date: "2024-10-31" },
    { name: "Christmas Day", date: "2024-12-25" },
];

function seed() {
    console.log('Seeding holidays...');
    for (const holiday of holidays) {
        holidayDB.create(holiday.name, holiday.date);
    }
    console.log('Seeding complete.');
}

seed();
