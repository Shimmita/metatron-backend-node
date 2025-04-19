import app from "express";
import { handleFetchAllMyNetwork } from "../controllers/manage_network_route.js";

const manageNetworkRoute = app.Router();

//fetch all networks or friends or conncetions of a user
manageNetworkRoute.post("/all", handleFetchAllMyNetwork);

export default manageNetworkRoute;
