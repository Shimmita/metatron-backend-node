import app from "express";
import {
  handleCloseTutorial,
  handleCloseTutorialGroups,
  handleDeleteProfileView,
  handleGetSearchingUser,
  handleGetSpecificUser,
  handleGettingProfileViews,
  handleGetUserIsOnline,
  handleUserUpdateDetails
} from "../controllers/manage_users_controller.js";

import multer from "multer";
const manageUsersRoute = app.Router();

// set up multer for file uploads
const uploadMulter = multer({
  storage: multer.memoryStorage()
});

// getting all the profile views of the specific user
manageUsersRoute.get("/all/profile_views/:userId", handleGettingProfileViews);

// delete or clear a profile view
manageUsersRoute.delete("/all/delete/profile_views/:viewId", handleDeleteProfileView);

//get specific user
manageUsersRoute.get("/all/specific/:id/:senderId", handleGetSpecificUser);

// check if specific user is online or not route based on session data
manageUsersRoute.get("/all/online/:userID", handleGetUserIsOnline);

// for searching users from the frontend during typing for autocomplete
manageUsersRoute.get("/all/search/result/user", handleGetSearchingUser);

// update the tutorial status
manageUsersRoute.post("/all/tutorial",handleCloseTutorial)

// update no show tutorial groups and communities
manageUsersRoute.post("/all/tutorial/groups",handleCloseTutorialGroups)

// manage updating of the user details: phone,expertise,skills,location, about
manageUsersRoute.put(
  "/update/:id",
  uploadMulter.single("image"),
  handleUserUpdateDetails
);

export default manageUsersRoute;