// Entry-point HTTP. `npm run dev` inicia em watch mode; `npm start`
// roda o build.

import { buildApp } from "./http/app.js";
import { services } from "./index.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

async function main(): Promise<void> {
  const app = await buildApp(
    {
      roadmapService: services.roadmap,
      progressService: services.progress,
    },
    { logger: { level: process.env.LOG_LEVEL ?? "info" } },
  );

  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`HTTP listening on :${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
