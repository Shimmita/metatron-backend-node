import express from "express";
import { handleCreateEventRSVP, handleCreateNewEvent, handleDeleteMyEvent, handleDeletionRSVP, handleGetAllEvents, handleGetEventRSVP, handleGetEventsRecommended, handleGetEventStats, handleGetNearbyEvents, handleGetSearchEvents, handleGetSpecificUserEvents, handleGetTopEvents } from '../controllers/manage_events_controller.js';
export const eventsManageRouter = express.Router();

//create event route
eventsManageRouter.post(
  "/create",handleCreateNewEvent
);
// get events route
eventsManageRouter.get("/all",handleGetAllEvents)

// get top 3 events
eventsManageRouter.get("/all/top",handleGetTopEvents)


// get all events associated with a specific user
eventsManageRouter.get("/all/:userId",handleGetSpecificUserEvents)

// get all events search results
eventsManageRouter.post("/all/search",handleGetSearchEvents)

// get all nearby events
eventsManageRouter.post("/all/nearby",handleGetNearbyEvents)

// get recommended events, based on skills of the user
eventsManageRouter.post("/all/recommended",handleGetEventsRecommended)

// perform event rsvp
eventsManageRouter.post("/create/rsvp",handleCreateEventRSVP)

// get all events rsvp
eventsManageRouter.get("/all/rsvp/:userId",handleGetEventRSVP)

// get all event stats, requesting for stats
eventsManageRouter.get("/all/rsvp/stats/:eventId",handleGetEventStats)

// handle deletion of rsvp
eventsManageRouter.delete("/delete/rsvp/:userId/:eventId",handleDeletionRSVP)

// delete of an event posted by the owner, owner deleting their event
eventsManageRouter.delete("/delete/event/:userId/:eventId",handleDeleteMyEvent)

