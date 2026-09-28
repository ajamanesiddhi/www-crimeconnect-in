import { createFileRoute } from "@tanstack/react-router";
import { seedDemo } from "@/lib/demo-seed.server";

export const Route = createFileRoute("/api/public/seed-demo")({
  server: { handlers: { POST: async () => Response.json(await seedDemo()) } },
});
