import app from "express";
import { handleCreatePaypalOrderIdCourses, handleProcessingOrderIdCourses } from "../controllers/manage_payment_controller.js";

const manage_payment_route = app.Router();

// PAYPAL COURSE PAYMENT ROUTES

// route create order paypal
manage_payment_route.post("/api/paypal/orders",handleCreatePaypalOrderIdCourses);

// route manage orderId 
manage_payment_route.post("/api/paypal/orders/:orderId/capture",handleProcessingOrderIdCourses);


// OTHER PAYMENT ROUTES

export default manage_payment_route;
