import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const password = await prompt.question("Choose a unique CMS password (at least 16 characters): ");
prompt.close();
if (password.length < 16) throw new Error("Password must be at least 16 characters.");
const salt = randomBytes(16);
console.log(`CMS_ADMIN_PASSWORD_HASH=scrypt-${salt.toString("hex")}-${scryptSync(password, salt, 64).toString("hex")}`);
console.log(`CMS_SESSION_SECRET=${randomBytes(32).toString("hex")}`);
console.log(`CMS_REVALIDATE_SECRET=${randomBytes(32).toString("hex")}`);
