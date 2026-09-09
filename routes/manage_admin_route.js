import express from "express";
import {
  handleAdminOnly,
  handleCleanupExpiredExternalResourcesAdmin,
  handleDeleteAdminResource,
  handleGetAdminOverview,
  handleGetAdminResource,
  handleGetAdminSettings,
  handleScrapeExternalTechCoursesAdmin,
  handleScrapeLatestTechJobsAdmin,
  handleScrapeUpcomingTechEventsAdmin,
  handleSendAdminMessage,
  handleToggleAdminResourceDisabled,
  handleUpdateAdminSettings,
  handleUpdateJobStatusAdmin,
  handleUpdateUserRole,
} from "../controllers/manage_admin_controller.js";

const manageAdminRoute = express.Router();

manageAdminRoute.use(handleAdminOnly);

manageAdminRoute.get("/overview", handleGetAdminOverview);
manageAdminRoute.get("/settings", handleGetAdminSettings);
manageAdminRoute.get("/resources/:resource", handleGetAdminResource);
manageAdminRoute.post("/message", handleSendAdminMessage);
manageAdminRoute.post("/jobs/scrape", handleScrapeLatestTechJobsAdmin);
manageAdminRoute.post("/events/scrape", handleScrapeUpcomingTechEventsAdmin);
manageAdminRoute.post("/courses/scrape", handleScrapeExternalTechCoursesAdmin);
manageAdminRoute.post("/maintenance/expired-external", handleCleanupExpiredExternalResourcesAdmin);
manageAdminRoute.patch("/settings", handleUpdateAdminSettings);
manageAdminRoute.patch("/users/:userId/role", handleUpdateUserRole);
manageAdminRoute.patch("/jobs/:jobId/status", handleUpdateJobStatusAdmin);
manageAdminRoute.patch("/resources/:resource/:id/disabled", handleToggleAdminResourceDisabled);
manageAdminRoute.delete("/resources/:resource/:id", handleDeleteAdminResource);

export default manageAdminRoute;
