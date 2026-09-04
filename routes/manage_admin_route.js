import express from "express";
import {
  handleAdminOnly,
  handleDeleteAdminResource,
  handleGetAdminOverview,
  handleGetAdminResource,
  handleSendAdminMessage,
  handleToggleAdminResourceDisabled,
  handleUpdateJobStatusAdmin,
  handleUpdateUserRole,
} from "../controllers/manage_admin_controller.js";

const manageAdminRoute = express.Router();

manageAdminRoute.use(handleAdminOnly);

manageAdminRoute.get("/overview", handleGetAdminOverview);
manageAdminRoute.get("/resources/:resource", handleGetAdminResource);
manageAdminRoute.post("/message", handleSendAdminMessage);
manageAdminRoute.patch("/users/:userId/role", handleUpdateUserRole);
manageAdminRoute.patch("/jobs/:jobId/status", handleUpdateJobStatusAdmin);
manageAdminRoute.patch("/resources/:resource/:id/disabled", handleToggleAdminResourceDisabled);
manageAdminRoute.delete("/resources/:resource/:id", handleDeleteAdminResource);

export default manageAdminRoute;
