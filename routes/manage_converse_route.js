import app from "express";
import {
  handleCreateNewConversation,
  handleDeleteMessageConversation,
  handleGetAllMessageConversation,
  handleGetUserConvesations,
  handleLastMessageConversationSeen,
  handleSendMessageToConversation,
  handleUpdateMessageConversation,
} from "../controllers/manage_Convers_controller.js";

const manageConversationsRoute = app.Router();

//create a conversation
manageConversationsRoute.post("/users/create", handleCreateNewConversation);

// send a message to an existing conversation
manageConversationsRoute.post(
  "/users/message/create",
  handleSendMessageToConversation
);

// get user specific conversations based on their iD
manageConversationsRoute.get("/users/all/:userID", handleGetUserConvesations);

// get all messages of a given conversation unique ID
manageConversationsRoute.get(
  "/users/message/:conversationId",
  handleGetAllMessageConversation
);

// update conversation message route
manageConversationsRoute.put(
  "/users/message/update/:messageId",
  handleUpdateMessageConversation
);

// update the conversation last message being seen by the target by passing
// ID of the conversation
manageConversationsRoute.put(
  "/users/message/last/:conversationId",
  handleLastMessageConversationSeen
);

// handle deletion of the message by replacing the message to null and is deleted true
manageConversationsRoute.delete(
  "/users/message/delete/:messageId",
  handleDeleteMessageConversation
);

export default manageConversationsRoute;
