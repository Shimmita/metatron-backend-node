import app from "express";
import {
  handleCompletePaswordReset as handleCompletePasswordReset,
  handleEmailVerification,
  handleResetCodeRequest,
  handleResetPassword,
  handleSigninPersonal,
  handleSignupPersonal,
  handleSignupPersonalMongo,
} from "../controllers/authentication_controller.js";
import multer from "multer";
const authenticationRouter = app.Router();
// Set up multer for file uploads
const uploadMulter = multer({ storage: multer.memoryStorage() });

// signup user with personal a/c using google auth that takes token param
authenticationRouter.post(
  "/personal/google/:token",
  uploadMulter.single("image"),
  handleSignupPersonal
);

// signup user without a provider to mongoDB database
authenticationRouter.post(
  "/personal/mongo",
  uploadMulter.single("image"),
  handleSignupPersonalMongo
);


// check the password reset code
authenticationRouter.post("/personal/reset/verify", handleResetPassword);
// request for a password reset code
authenticationRouter.post("/personal/reset/request", handleResetCodeRequest);

// complete password reset route
authenticationRouter.post("/personal/reset/complete", handleCompletePasswordReset);

// signin users without provider
authenticationRouter.post("/personal", handleSigninPersonal);

// verify the email of the user
authenticationRouter.post("/personal/verify/email",handleEmailVerification)



export default authenticationRouter;
