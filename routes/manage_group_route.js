import app from "express";
import { handleFetchGroupDetails, handleGetAllGroupsCommunity, handleJoinGroupCommunity } from "../controllers/manage_group_controller.js";

const manageGroupCommunityRoute = app.Router();

// joining community
manageGroupCommunityRoute.post("/join", handleJoinGroupCommunity);

// get all groups
manageGroupCommunityRoute.get("/all/:userId", handleGetAllGroupsCommunity);

// get all posts of a given group
manageGroupCommunityRoute.get("/all/:userId/:groupId", handleFetchGroupDetails);


export default manageGroupCommunityRoute;
