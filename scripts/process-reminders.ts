import { prisma } from "../src/lib/prisma";
import { processDueReminders } from "../src/lib/reminder-worker";

processDueReminders().then(count => { process.stdout.write(`Processed ${count} due reminders.\n`); }).finally(() => prisma.$disconnect());
