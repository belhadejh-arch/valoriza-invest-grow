import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapAdminAccount } from "./legacy/admin-auth";
import { prepareDepositProofSchema } from "./legacy/deposit-proof-schema";
import { reconcileHistoricalReferralMilestones } from "./legacy/server";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Render and Replit can point to different databases. Prepare the receipt
// schema against the database actually connected to this process.
prepareDepositProofSchema()
  .then(() => bootstrapAdminAccount())
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
      void reconcileHistoricalReferralMilestones().catch((err: unknown) => {
        logger.error({ err }, "Historical referral milestone reconciliation failed");
      });
    });
  })
  .catch((err: unknown) => {
    logger.error({ err }, "Server database preparation failed");
    process.exit(1);
  });
