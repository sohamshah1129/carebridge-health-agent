import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
async function main() {
  const passwordHash = await hash("ChangeMe-Local-2026!", 12);
  await prisma.user.upsert({ where: { email: "admin@carebridge.local" }, update: {}, create: { name: "Aarav Mehta", email: "admin@carebridge.local", passwordHash, role: "ADMIN" } });
  const doctors = [
    { name: "Dr. Rohan Menon", specialty: "Cardiology", email: "rohan.menon@carebridge.local" },
    { name: "Dr. Ananya Rao", specialty: "Orthopedics", email: "ananya.rao@carebridge.local" },
    { name: "Dr. Mira Das", specialty: "Dermatology", email: "mira.das@carebridge.local" },
    { name: "Dr. Sanjay Rao", specialty: "General Medicine", email: "sanjay.rao@carebridge.local" },
  ];
  for (const item of doctors) {
    const doctor = await prisma.doctor.upsert({ where: { email: item.email }, update: item, create: item });
    for (let day = 1; day <= 7; day++) {
      const date = new Date(); date.setUTCDate(date.getUTCDate() + day); date.setUTCHours(4, 0, 0, 0);
      for (let index = 0; index < 8; index++) { const startsAt = new Date(date.getTime() + index * 45 * 60000); await prisma.slot.upsert({ where: { doctorId_startsAt: { doctorId: doctor.id, startsAt } }, update: {}, create: { doctorId: doctor.id, startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60000) } }); }
    }
  }
  await prisma.insurer.upsert({ where: { name: "Star Health (mock)" }, update: {}, create: { name: "Star Health (mock)" } });
}
main().finally(() => prisma.$disconnect());
