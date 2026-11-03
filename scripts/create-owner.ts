import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../src/lib/prisma";

const ownerInput = z.object({
  OWNER_EMAIL: z.string().trim().email().max(254),
  OWNER_NAME: z.string().trim().min(1).max(100).default("Clinic Owner"),
  OWNER_PASSWORD: z.string().min(12).max(128),
});

async function main() {
  const parsed = ownerInput.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Set a valid OWNER_EMAIL and OWNER_NAME, and an OWNER_PASSWORD of 12–128 characters.");
  }

  const email = parsed.data.OWNER_EMAIL.toLowerCase();
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) throw new Error("An admin account already exists; refusing to create another owner.");

  const passwordHash = await hash(parsed.data.OWNER_PASSWORD, 12);
  await prisma.user.create({
    data: { name: parsed.data.OWNER_NAME, email, passwordHash, role: "ADMIN" },
  });
  process.stdout.write("Owner account created. Store the password in your password manager.\n");
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Could not create owner account."}\n`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
