import express from "express";
import { handleCreateEventRSVP, handleCreateNewEvent, handleDeleteMyEvent, handleDeletionRSVP, handleGetAllEvents, handleGetEventRSVP, handleGetEventsRecommended, handleGetEventStats, handleGetNearbyEvents, handleGetSearchEvents, handleGetSpecificEvent, handleGetSpecificUserEvents, handleGetTopEvents } from '../controllers/manage_events_controller.js';
import { handleAuthMiddleware } from '../middlewares/auth_middleware.js';
export const eventsManageRouter = express.Router();

//create event route
eventsManageRouter.post(
  "/create",
  handleAuthMiddleware,
  handleCreateNewEvent
);

// get top 3 events
eventsManageRouter.get("/all/top",
  handleAuthMiddleware,
  handleGetTopEvents)

// get events route
eventsManageRouter.get("/all",handleGetAllEvents)

// get specific event
eventsManageRouter.get("/all/specific/:eventId",handleGetSpecificEvent)


// get all events associated with a specific user
eventsManageRouter.get("/all/:userId",handleAuthMiddleware,handleGetSpecificUserEvents)

// get all events search results
eventsManageRouter.post("/all/search",handleAuthMiddleware,handleGetSearchEvents)

// get all nearby events
eventsManageRouter.post("/all/nearby",handleAuthMiddleware,handleGetNearbyEvents)

// get recommended events, based on skills of the user
eventsManageRouter.post("/all/recommended",handleAuthMiddleware,handleGetEventsRecommended)

// perform event rsvp
eventsManageRouter.post("/create/rsvp",handleAuthMiddleware,handleCreateEventRSVP)

// get all events rsvp
eventsManageRouter.get("/all/rsvp/:userId",handleAuthMiddleware,handleGetEventRSVP)

// get all event stats, requesting for stats
eventsManageRouter.get("/all/rsvp/stats/:eventId",handleAuthMiddleware,handleGetEventStats)

// handle deletion of rsvp
eventsManageRouter.delete("/delete/rsvp/:userId/:eventId",handleAuthMiddleware,handleDeletionRSVP)

// delete of an event posted by the owner, owner deleting their event
eventsManageRouter.delete("/delete/event/:userId/:eventId",handleAuthMiddleware,handleDeleteMyEvent)

