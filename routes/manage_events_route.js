import express from "express";
import { handleCreateNewEvent, handleGetAllEvents } from '../controllers/manage_events_controller.js';
export const eventsManageRouter = express.Router();

//create event route
eventsManageRouter.post(
  "/create",handleCreateNewEvent
);
// get events route
eventsManageRouter.get("/all",handleGetAllEvents)
