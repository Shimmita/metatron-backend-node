import cron from "node-cron";
import { scrapeAndSaveExternalTechCourses } from "./courseScraperService.js";
import { scrapeAndSaveUpcomingTechEvents } from "./eventScraperService.js";
import { scrapeAndSaveLatestTechJobs } from "./jobScraperService.js";
import { backfillExternalScrapedLogos } from "./scraperLogoService.js";

let scheduledTask = null;
let isRunning = false;

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(`${value}`.toLowerCase());
};

const runExternalScraperUpdate = async (reason = "scheduled") => {
  if (isRunning) {
    console.log(`[external-scraper-cron] skipped ${reason}; previous scrape still running`);
    return null;
  }

  isRunning = true;
  const startedAt = new Date();
  console.log(`[external-scraper-cron] ${reason} scrape started at ${startedAt.toISOString()}`);

  try {
    const jobs = await scrapeAndSaveLatestTechJobs({
      limit: Number(process.env.JOB_SCRAPER_CRON_LIMIT) || 180,
      perSourceLimit: Number(process.env.JOB_SCRAPER_CRON_PER_SOURCE_LIMIT) || 40,
    });
    const events = await scrapeAndSaveUpcomingTechEvents({
      limit: Number(process.env.EVENT_SCRAPER_CRON_LIMIT) || 160,
      perSourceLimit: Number(process.env.EVENT_SCRAPER_CRON_PER_SOURCE_LIMIT) || 40,
    });
    const courses = await scrapeAndSaveExternalTechCourses({
      limit: Number(process.env.COURSE_SCRAPER_CRON_LIMIT) || 160,
      perSourceLimit: Number(process.env.COURSE_SCRAPER_CRON_PER_SOURCE_LIMIT) || 40,
    });
    const logoBackfill = await backfillExternalScrapedLogos({
      limit: Number(process.env.EXTERNAL_LOGO_BACKFILL_LIMIT) || 90,
    });

    console.log(
      `[external-scraper-cron] ${reason} scrape complete: jobs inserted=${jobs.inserted}, skipped=${jobs.skipped}; events inserted=${events.inserted}, skipped=${events.skipped}; courses inserted=${courses.inserted}, skipped=${courses.skipped}; logos updated jobs=${logoBackfill.updated.jobs}, events=${logoBackfill.updated.events}, courses=${logoBackfill.updated.courses}`
    );

    return { jobs, events, courses, logoBackfill };
  } catch (error) {
    console.log(`[external-scraper-cron] ${reason} scrape failed: ${error.message}`);
    return null;
  } finally {
    isRunning = false;
  }
};

export const startExternalScraperCron = () => {
  if (scheduledTask) return scheduledTask;

  if (parseBoolean(process.env.DISABLE_EXTERNAL_SCRAPER_CRON, false)) {
    console.log("[external-scraper-cron] disabled by DISABLE_EXTERNAL_SCRAPER_CRON");
    return null;
  }

  const timezone = process.env.EXTERNAL_SCRAPER_CRON_TIMEZONE || process.env.TZ || "Africa/Nairobi";
  const expression = process.env.EXTERNAL_SCRAPER_CRON || "0 0 * * *";

  scheduledTask = cron.schedule(
    expression,
    () => {
      runExternalScraperUpdate("midnight");
    },
    { timezone }
  );

  console.log(`[external-scraper-cron] scheduled "${expression}" in ${timezone}`);

  if (parseBoolean(process.env.RUN_EXTERNAL_SCRAPER_ON_START, false)) {
    setTimeout(() => runExternalScraperUpdate("startup"), 5000);
  }

  return scheduledTask;
};

export { runExternalScraperUpdate };
