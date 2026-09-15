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
  handleDownloadPostDocument,
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
  handleViewPostDocument,
} from "../controllers/manage_post_controller.js";
const MAX_POST_PDF_SIZE = 20 * 1024 * 1024;

const postUploadFilter = (req, file, cb) => {
  if (file.fieldname === "documents") {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF documents can be attached to posts"));
      return;
    }

    cb(null, true);
    return;
  }

  if (["image", "images"].includes(file.fieldname)) {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new Error("Only image files can be attached as post media"));
      return;
    }

    cb(null, true);
    return;
  }

  cb(new Error("Unsupported post attachment field"));
};

// Set up multer for file uploads
const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_POST_PDF_SIZE,
  },
  fileFilter: postUploadFilter
});

const handlePostUpload = (req, res, next) => {
  uploadMulter.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 3 },
    { name: "documents", maxCount: 1 },
  ])(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).send("Post attachments must be 20MB or smaller");
      return;
    }

    res.status(400).send(error.message || "Unable to upload post attachments");
  });
};

export const postManageRouter = express.Router();

//create post route
postManageRouter.post(
  "/create",
  handlePostUpload,
  handleCreateNewPost
);

// getAllPost default
postManageRouter.get("/all", handleGetAllTechiePost);

// get All Posts, specifically filtered results
postManageRouter.post("/all", handleGetAllFilteredPosts);

// get top posts
postManageRouter.get("/top", handleGetTopPosts);

// view a post PDF document inline
postManageRouter.get("/document/:postId/:documentIndex/view", handleViewPostDocument);

// download a post PDF document
postManageRouter.get("/document/:postId/:documentIndex/download", handleDownloadPostDocument);

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
