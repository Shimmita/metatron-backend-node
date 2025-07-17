import mongoose from "mongoose";

// course favorites model
const PostFavorites = new mongoose.Schema(
  {
    // post id
    postId: {
    type: String,
    required: [true, "postId is required"],
    trim: true,
    },

    // id of the user, adding post to their favorite
    userFavoriteId: {
    type: String,
    required: [true, "user id required"],
    trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("post_favorite", PostFavorites);
