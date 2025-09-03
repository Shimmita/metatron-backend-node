import app from "express";
import { handleCertificateVerification } from "../controllers/manage_cert_verify_controller.js";

const manageCertVerifyRoute = app.Router();

// route hits the verification controller
manageCertVerifyRoute.post("/verify", handleCertificateVerification);

export default manageCertVerifyRoute;
