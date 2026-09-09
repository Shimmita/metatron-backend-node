import cron from "node-cron";
import { cleanupExpiredExternalResources } from "./externalAvailabilityCleanupService.js";

let scheduledTask = null;
let isRunning = false;

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(`${value}`.toLowerCase());
};

const runExternalExpiryCleanup = async (reason = "scheduled") => {
  if (isRunning) {
    console.log(`[external-expiry-cleanup] skipped ${reason}; previous cleanup still running`);
    return null;
  }

  isRunning = true;
  const startedAt = new Date();
  console.log(`[external-expiry-cleanup] ${reason} cleanup started at ${startedAt.toISOString()}`);

  try {
    const result = await cleanupExpiredExternalResources({
      limitPerModel: Number(process.env.EXTERNAL_EXPIRY_CLEANUP_LIMIT) || 80,
    });

    console.log(
      `[external-expiry-cleanup] ${reason} cleanup complete: jobs expired=${result.expired.jobs}, events expired=${result.expired.events}, courses expired=${result.expired.courses}; notified jobs=${result.notified.jobs}, events=${result.notified.events}, courses=${result.notified.courses}`
    );

    return result;
  } catch (error) {
    console.log(`[external-expiry-cleanup] ${reason} cleanup failed: ${error.message}`);
    return null;
  } finally {
    isRunning = false;
  }
};

export const startExternalExpiryCleanupCron = () => {
  if (scheduledTask) return scheduledTask;

  if (parseBoolean(process.env.DISABLE_EXTERNAL_EXPIRY_CLEANUP_CRON, false)) {
    console.log("[external-expiry-cleanup] disabled by DISABLE_EXTERNAL_EXPIRY_CLEANUP_CRON");
    return null;
  }

  const timezone = process.env.EXTERNAL_EXPIRY_CLEANUP_TIMEZONE || process.env.TZ || "Africa/Nairobi";
  const expression = process.env.EXTERNAL_EXPIRY_CLEANUP_CRON || "0 0 * * *";

  scheduledTask = cron.schedule(
    expression,
    () => {
      runExternalExpiryCleanup("midnight");
    },
    { timezone }
  );

  console.log(`[external-expiry-cleanup] scheduled "${expression}" in ${timezone}`);

  if (parseBoolean(process.env.RUN_EXTERNAL_EXPIRY_CLEANUP_ON_START, false)) {
    setTimeout(() => runExternalExpiryCleanup("startup"), 9000);
  }

  return scheduledTask;
};

export { runExternalExpiryCleanup };
