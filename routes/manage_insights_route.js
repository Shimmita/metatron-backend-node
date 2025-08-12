import app from "express";
import { getAllInsightsRecommendation, getPlatformInsights } from "../controllers/manage_insights_controller.js";

const managePlatformInsights = app.Router();

// route gets all platform insights
managePlatformInsights.get("/all", getPlatformInsights);

// recommendation insights
managePlatformInsights.post("/all/recommendation", getAllInsightsRecommendation);

export default managePlatformInsights;
