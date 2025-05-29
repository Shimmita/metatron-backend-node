import app from "express";
import { handleFetchAllMyNetwork } from "../controllers/manage_network_controller.js";

const manageNetworkRoute = app.Router();

//fetch all networks or friends or connections of a user
manageNetworkRoute.post("/all", handleFetchAllMyNetwork);

export default manageNetworkRoute;
