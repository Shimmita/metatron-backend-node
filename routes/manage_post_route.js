import express from "express";
import multer from "multer";
import {
  handleCreateNewPost,
  handleDeleteCommentReply,
  handleDeleteFavoritePost,
  handleDeletePostReaction,
  handleDeleteUserComment,
  handleDeleteUserPost,
  handleGetAllFavoritePosts,
  handleGetAllFilteredPosts,
  handleGetAllPostReportUser,
  handleGetAllPostsReactions,
  handleGetAllPostsUserSpecific,
  handleGetAllTechiePost,
  handleGetCommentReplies,
  handleGetSpecificPostDetails,
  handleGetTopPosts,
  handleGithubIncremental,
  handlePostCommentsCreate,
  handlePostFavoriteCreate,
  handlePostLiking,
  handlePostReportedDelete,
  handleReplyComment,
  handleReportPostContent,
  handleUpdateEditComment,
  handleUpdateEditCommentReply,
  handleUpdateUserPost,
  handleUpdatingOfPost,
} from "../controllers/manage_post_controller.js";
// Set up multer for file uploads
const uploadMulter = multer({
  storage: multer.memoryStorage()
});

export const postManageRouter = express.Router();

//create post route
postManageRouter.post(
  "/create",
  uploadMulter.single("image"),
  handleCreateNewPost
);

// getAllPost default
postManageRouter.get("/all", handleGetAllTechiePost);

// get All Posts, specifically filtered results
postManageRouter.post("/all", handleGetAllFilteredPosts);

// get top posts
postManageRouter.get("/top", handleGetTopPosts);

// get specific post
postManageRouter.get("/all/:id", handleGetSpecificPostDetails);

// get all user specific posts
postManageRouter.get("/users/all/:id", handleGetAllPostsUserSpecific);

// edit post
postManageRouter.patch("/edit/:id", handleUpdateUserPost);

// delete post
postManageRouter.delete("/delete/:userId/:postId", handleDeleteUserPost);

// update post likes
postManageRouter.put("/update/likes", handlePostLiking);

// update the github clicks
postManageRouter.put("/update/github", handleGithubIncremental);

// update post comments, post entangled and notification delete-able
postManageRouter.put("/update/comments", handlePostCommentsCreate);

// update post favorite 
postManageRouter.put("/update/favorite", handlePostFavoriteCreate);

// get all favorite posts of the user
postManageRouter.get("/favorite/all/:userId", handleGetAllFavoritePosts);

// delete favorite post
postManageRouter.delete("/favorite/delete/:userId/:postId", handleDeleteFavoritePost);

// send reply to a comment
postManageRouter.post("/reply/comments", handleReplyComment)

// fetch replies to a comment
postManageRouter.get("/reply/comments/:postId/:parentCommentId/:userId", handleGetCommentReplies)

// edit the parent comment
postManageRouter.put("/edit/comments/", handleUpdateEditComment);

// edit the comment reply
postManageRouter.put("/edit/reply/comments/", handleUpdateEditCommentReply);

// delete a reply comment
postManageRouter.delete("/delete/reply/comments/:userId/:commentId", handleDeleteCommentReply);

// delete a user's parent comment entirely
postManageRouter.delete("/delete/comments/:postId/:userId/:commentId", handleDeleteUserComment);

// update a post details or info specifically body content
postManageRouter.put("/update/post/:id", handleUpdatingOfPost);

// get all post reactions if they match passedID for it's belongs them as notification
postManageRouter.get("/reactions/all/:id", handleGetAllPostsReactions);

/* delete specific post reaction by unique Ids of the post. a liked user doesn't need this route to delete their
 liked reaction i.e like/unlike coz it will auto-delete when they unlike. but the user being notified that their
 post got a like  needs this route to delete the notification reaction */
postManageRouter.delete("/reactions/delete/:id", handleDeletePostReaction);

// report a post route like its content is not relevant,plagiarism or scam etc
postManageRouter.post("/report/create", handleReportPostContent);

// get all post report that is associated with Id of the user, specially are owners of the posts
postManageRouter.get("/report/get/:ownerId", handleGetAllPostReportUser);

// delete post reported reaction, actually wont delete but update owner viewed the report.
// the report will be used for further analysis by technical team
postManageRouter.delete("/report/delete/:id", handlePostReportedDelete);