import app from "express";
import { handleGetGlobalSearchResults } from "../controllers/manage_global_search_controller.js";

const manageGlobalSearchRoute = app.Router();
// Set up multer for file uploads

//get specific user
manageGlobalSearchRoute.get(
  "/search/:search_term",
  handleGetGlobalSearchResults
);

export default manageGlobalSearchRoute;
