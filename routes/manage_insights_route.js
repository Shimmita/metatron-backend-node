import app from "express";
import { getPlatformInsights } from "../controllers/manage_insights_controller.js";

const managePlatformInsights = app.Router();

// route gets all platform insights
managePlatformInsights.get("/all", getPlatformInsights);

export default managePlatformInsights;
