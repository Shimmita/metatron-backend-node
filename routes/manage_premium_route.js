import app from "express";
import { handlePremiumEnrollment } from "../controllers/manage_premium_controller.js";

const manage_premium_route = app.Router();

// route enroll into premium account
manage_premium_route.post("/enroll", handlePremiumEnrollment);

export default manage_premium_route;
