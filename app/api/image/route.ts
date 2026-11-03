import { randomBytes } from "node:crypto";
import { authenticated, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sameOrigin(request))) return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 3_000_000) return Response.json({ error: "Image must be under 2 MB" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size > 2_000_000 || file.size === 0 || !allowed.has(file.type)) return Response.json({ error: "Upload a JPEG, PNG, WebP, or AVIF image under 2 MB" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid = file.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 :
    file.type === "image/png" ? Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from("89504e470d0a1a0a", "hex")) :
    file.type === "image/webp" ? Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP" :
    bytes.length > 12 && Buffer.from(bytes.subarray(4, 12)).toString() === "ftypavif";
  if (!valid) return Response.json({ error: "Image file does not match its type" }, { status: 400 });
  const id = randomBytes(16).toString("hex");
  try {
    await db().execute({ sql: "INSERT INTO cms_images (id, mime_type, bytes) VALUES (?, ?, ?)", args: [id, file.type, bytes] });
    return Response.json({ url: `/cms-image/${id}` });
  } catch (error) {
    console.error("CMS image upload failed", error);
    return Response.json({ error: "Image storage unavailable. Apply DevCalc migrations first." }, { status: 503 });
  }
}
