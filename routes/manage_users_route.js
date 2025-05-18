import app from "express";
import {
    handleGetSearchingUser,
    handleGetSpecifcUser,
    handleGetUserIsOnline,
    handleUserUpdateDetails,
} from "../controllers/manage_users_controller.js";

import multer from "multer";
const manageUsersRoute = app.Router();
// Set up multer for file uploads
const uploadMulter = multer({ storage: multer.memoryStorage() });

//get specific user
manageUsersRoute.get("/all/:id", handleGetSpecifcUser);

// check if specific user is online or not route based on session data
manageUsersRoute.get("/all/online/:userID", handleGetUserIsOnline);

// for searching users from the frontend during typing for autocomplete
manageUsersRoute.get("/all/search/result/user", handleGetSearchingUser);

// manage updating of the user details: phone,expertise,skills,location, about
manageUsersRoute.put(
  "/update/:id",
  uploadMulter.single("image"),
  handleUserUpdateDetails
);

export default manageUsersRoute;
