import personalModel from "../model/personalModel.js";
import PostFavorites from "../model/PostFavorites.js";
import {
  default as PostReactionModal,
  default as PostReactionModel,
} from "../model/PostReactionModel.js";
import ReportPostModal from "../model/ReportPostModal.js";
import {
  default as TechPostModal,
  default as TechPostModel,
} from "../model/TechPostModel.js";
import TechPostRepliesModel from "../model/TechPostRepliesModel.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary
} from "../utils/cloudinary.js";
import {
  CompressImageFunction
} from "../utils/compressImage.js";
// creating of new post
export const handleCreateNewPost = async (req, res) => {
  try {
    // extract the post object from the form data passed as body from frontend
    const data = JSON.parse(req?.body.post);

    //   check if user has file
    if (req?.file) {
      // Compress and convert the image to AVIF format
      const compressedImageBuffer = await CompressImageFunction(req.file.buffer)

      // Upload the compressed AVIF image to Cloudinary
      const result = await uploadToCloudinary(
        compressedImageBuffer,
        process.env.CLOUDINARY_POST_IMAGES_FOLDER
      );

      // getting avatar url and ID from the result of cloudinary upload
      const post_url = result.secure_url;
      const post_url_id = result.public_id;

      await TechPostModal.create({
        ...data,
        post_url,
        post_url_id
      });
      res.status(200).send("post uploaded successfully");
    } else {
      // save the user they have no file
      await TechPostModal.create(data);
      res.status(200).send("post uploaded successfully");
    }
  } catch (error) {
    let message = `${error.message}`;
    if (message.toLowerCase().includes("cloudinary")) {
      message = "please check your internet connection";
    } else {
      message = "something went wrong try again";
    }
    res.status(400).send(message);
  }
};

// handle updating of the post based on its ID
export const handleUpdatingOfPost = async (req, res) => {
  try {
    const {
      post_body
    } = req?.body || {};
    // extract the post id from the req.params
    const id = req?.params.id;
    // check if post present or not
    const post = await TechPostModal.findById(id);

    if (!post) {
      throw new Error("post does not exist");
    }

    // post present update
    post.post_body = post_body;

    // set that its edited or updated to true
    post.post_edited = true;
    // save the post with the updated details
    await post.save();

    // send success response to the frontend
    res.status(200).send({
      message: "updated successfully",
      post
    });
  } catch (error) {
    // debug
    console.log(error);

    // send error response to the frontend
    res.status(400).send(error.message);
  }
};

// get all posts
export const handleGetAllTechiePost = async (req, res) => {

  try {
    // extracting the query params from the frontend
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    // retrieve all posts in order of latest first
    const allPosts = await TechPostModal.find({})
      .sort({
        createdAt: -1
      })
      .skip(skip)
      .limit(limit);

    // posts are present
    res.status(200).send(allPosts);
  } catch (error) {
    res.status(400).send(error.message);
  }
};


// get all posts for filtered results, array options will be passed in body
export const handleGetAllFilteredPosts=async(req,res)=>{

  try {
      const filterArray=req.body || []
      // the data in request body should be in the format of an array
      if (!Array.isArray(filterArray)) {
        throw new Error('send an array of names!')
      }

    // Initialize query
    const query = {
      $and: []
    };

     // handle job_skill-set search
    if (filterArray.length > 0) {
      query.$and.push({
        $or: [
          ...filterArray.map((term) => ({
            'post_category.main': {
              $regex: term,
              $options: "i"
            },
          })),
        ],
      });
    }

     //fetch filtered posts from the database latest first, limit 20
    //  implement strategy to handle scenarios where data is over 20;pagination
      const filteredPostResults = await TechPostModel.find(query).sort({
          createdAt: -1,
      }).limit(20);

      // if no results send an error of empty
      if (!filteredPostResults) {
        throw new Error("no matching results!")
      }

    // send response back to the client
    res.status(200).send(filteredPostResults)    
  } catch (error) {
    // debug
    console.log(error.message)
    // send error to the backend
    res.status(400).send(error.message)
  }

}

// get top 4 posts
export const handleGetTopPosts = async (req, res) => {
  try {
    const posts = await TechPostModal.find().limit(4);
    res.status(200).send(posts);
  } catch (error) {
    //log the error
    console.log(error.message);
    //send the error to the fronted
    res.status(400).send(error.message);
  }
};

// get all tech posts of a user based on their ID
export const handleGetAllPostsUserSpecific = async (req, res) => {
  try {
    const userId = req?.params.id;
    // fetch first 20 posts from the database, latest first
    const posts = await TechPostModel.find({
        "post_owner.ownerId": userId,
      })
      .sort({
        createdAt: -1
      })
      .limit(20);

    // send the results to the frontend
    res.status(200).send(posts);
  } catch (error) {
    console.log(error.message);
    res.status(400).send("something went wrong");
  }
};

// get a specific post regardless of the owner
export const handleGetSpecificPostDetails = async (req, res) => {
  try {
    //extract post id from request params
    const {
      id: postId
    } = req?.params || {};

    // fetch the post from the database
    const post = await TechPostModel.findById({
      _id: postId
    });
    if (!post) {
      throw new Error("post not found!");
    }
    // send the response to the frontend
    res.status(200).send(post);
  } catch (error) {
    console.log(error.message);
    res.status(400).send("something went wrong");
  }
};

// edit tech post
export const handleUpdateUserPost = async (req, res) => {
  // get the body
  const body = req?.body;
  // obtain id passed as params
  const id = req.params.id;

  try {
    await TechPostModal.findByIdAndUpdate({
      _id: id
    }, {
      $set: {
        post_body: body
      }
    });

    res.status(200).send("post updated successfully");
  } catch (error) {
    res.status(400).send("failed to update post " + error.message);
  }
};

// delete tech post
export const handleDeleteUserPost = async (req, res) => {
  // destructuring the ids of post and users from the req params
  const {
    userId,
    postId
  } = req?.params || {};

  try {
    // checking if user present based on the params id
    const user = await personalModel.findById(userId);
    // check post present
    const post = await TechPostModel.findById(postId)

    if (!user) {
      throw new Error("user does not exist");
    }

    if (!post) {
      throw new Error("post does not exist")
    }

    // check if the post contains post_url_id means 
    // image is in cloudinary so delete it first
    if (post.post_url_id?.length > 1) {
      await deleteFromCloudinary(post.post_url_id)
    }

    // proceed deletion of the post
    await TechPostModal.findByIdAndDelete(postId);

    // send success response to the frontend
    res.status(200).send("post has been deleted successfully");
  } catch (error) {
    // debug
    console.log(error.message);
    // send error response to the frontend
    res.status(400).send(error.message);
  }
};

// increment likes of a tech post
export const handlePostLiking = async (req, res) => {
  try {
    const data = req?.body;

    const post = await TechPostModel.findById({
      _id: data.postId
    });

    // will save the id user currently liking the post in clickers of likes
    const userId = data.userId;

    // saved in the notification collection
    const notificationPostData = {
      postId: data.postId,
      ownerId: data.ownerId,
      userId: data.userId,
      name: data.name,
      title: data.title,
      comments: 0,
      likes: 0,
      github: 0,
      avatar: data.avatar,
      message: data.message,
      minimessage: data.minimessage,
      country: data.country,
      county: data.county


    };

    if (!post) {
      throw new Error("post not found!");
    }
    // if userId not present in the clickers, increment clicks else reverse
    if (
      !post.post_liked.clickers.some((clickerId) => clickerId === data.userId)
    ) {
      // increment post likes
      post.post_liked.clicks = post.post_liked.clicks + 1;

      // add userId to the clickers array
      post.post_liked.clickers.push(userId);

      // save the updated tech post
      await post.save();

      // extract the github, likes and comments of the saved post
      const {
        clicks: likes
      } = post.post_liked;
      const {
        clicks: github
      } = post.post_github;
      const {
        count: comments
      } = post.post_comments;
      const report_count = post.report_count;

      // save the details of the user liking the  tech post in the reaction section
      await PostReactionModal.create({
        ...notificationPostData,
        likes,
        github,
        comments,
        report_count,
      });

      const results = {
        post: post,
        reaction: "liked",
      };
      // send the response to the frontend
      res.status(200).send(results);
    } else {
      // decrement tech post likes and remove the user details from the clickers array
      post.post_liked.clicks =
        post.post_liked.clicks > 0 ? post.post_liked.clicks - 1 : 0;
      // remove the userId from clickers array
      post.post_liked.clickers = post.post_liked.clickers.filter(
        (clickerId) => clickerId !== data.userId
      );

      // save the updated post
      await post.save();
      // remove the current user details in the post-reactions details
      await PostReactionModal.findOneAndDelete({
        userId
      });

      const results = {
        post: post,
        reaction: "disliked",
      };

      // send response to the frontend
      res.status(200).send(results);
    }

    // resave the tech post with the latest updates
  } catch (error) {
    console.log(error)
    res.status(400).send("something went wrong");
  }
};

// increment github clicks once for all when visited
export const handleGithubIncremental = async (req, res) => {
  try {
    const data = req?.body;
    const post = await TechPostModel.findById({
      _id: data.postId
    });
    // will save the id user currently liking the post in clickers of github
    const userId = data.userId;

    // saved in the notification collection
    const notificationPostData = {
      postId: data.postId,
      ownerId: data.ownerId,
      userId: data.userId,
      name: data.name,
      comments: 0,
      likes: 0,
      github: 0,
      title: data.title,
      avatar: data.avatar,
      message: data.message,
      minimessage: data.minimessage,
      country: data.country,
      county: data.county
    };

    if (!post) {
      throw new Error("post not found!");
    }
    // if userId not present in the clickers of github, increment clicks
    if (
      !post.post_github.clickers.some((clickerId) => clickerId === data.userId)
    ) {
      // increment post likes
      post.post_github.clicks = post.post_github.clicks + 1;

      // add userId to the clickers array of github
      post.post_github.clickers.push(userId);

      // save the updated tech post
      await post.save();

      // extract the github, likes and comments of the saved post
      const {
        clicks: likes
      } = post.post_liked;
      const {
        clicks: github
      } = post.post_github;
      const {
        count: comments
      } = post.post_comments;
      const report_count = post.report_count;

      // save the details of the user clicking the github  in the reaction section
      await PostReactionModal.create({
        ...notificationPostData,
        likes,
        github,
        comments,
        report_count,
      });
    }

    // send the response of the non mutated tech post object to the frontend
    res.status(200).send(post);
  } catch (error) {
    console.log(error)
    res.status(400).send("something went wrong");
  }
};

// update post comment on the post and also reflect on notification
export const handlePostCommentsCreate = async (req, res) => {
  // extract the data from request body
  const data = req?.body;
  try {
    // saved in the post itself user comments, contains full comment
    const commentToSave = {
      userId: data.userId,
      name: data.name,
      title: data.title,
      avatar: data.avatar,
      minimessage: data.minimessage,
      country: data.country,
      county: data.county
    };

    // saved in the notification collection, contains truncate comment
    // message has two fields separated by comma, the message and post title
    const notificationPostData = {
      postId: data.postId,
      ownerId: data.ownerId,
      userId: data.userId,
      name: data.name,
      country: data.country,
      county: data.county,
      comments: 0,
      likes: 0,
      github: 0,
      title: data.title,
      avatar: data.avatar,
      message: data.message?.split(".")[0],
      minimessage: `${
        data.message?.split(".")[1]
      } — " ${data.minimessage?.substring(0, 25)}..."`,
    };


    // searching for post best on the postID passed
    const post = await TechPostModel.findById({
      _id: data.postId
    });


    if (!post) {
      throw new Error("post not found!");
    }


    // increment comment counts
    post.post_comments.count = post.post_comments.count + 1;

    // add comment to the comments array
    post.post_comments.comments = [
      commentToSave,
      ...post.post_comments.comments,
    ];

    // save the updated tech post
    await post.save();

    // extract the reports, github, likes and comments of the saved post
    const {
      clicks: likes
    } = post.post_liked;
    const {
      clicks: github
    } = post.post_github;
    const {
      count: comments
    } = post.post_comments;
    const report_count = post.report_count;

    // save the details of the user making the comment in the reaction database
    await PostReactionModal.create({
      ...notificationPostData,
      likes,
      github,
      comments,
      report_count,
    });

    // send the response to the frontend the object mutated
    res.status(200).send(post);

    // resave the tech post with the latest updates
  } catch (error) {

    // debug
    console.log(error);

    // send error to the frontend
    res.status(400).send("something went wrong");
  }
};


// handle reply to a comment
export const handleReplyComment = async (req, res) => {
  // extract the reply data from the body
  const dataReply = req?.body || {}

  try {
    // check exists user, post, parent-Comment 
    const user = await personalModel.findById(dataReply?.userId)
    const post = await TechPostModel.findById(dataReply?.parentPostId)
    //  using the post, check if the parent comment exists before reply
    const parentComment = post?.post_comments?.comments?.filter(comment => comment.id === dataReply?.parentCommentId)

    if (!user) {
      throw new Error("user not found!");
    }
    if (!post) {
      throw new Error("post not found!");
    }

    if (!parentComment) {
      throw new Error("parent comment not found!");
    }

    // save the reply in its respective db
    await TechPostRepliesModel.create(dataReply)

    // update the general comments counter on the parent post,increase
    post.post_comments.count = post.post_comments.count + 1;

    // increment the in context parent comment its replies counter
    let commentUpdated = post.post_comments.comments.find(comment => comment.id === dataReply?.parentCommentId)
    // updating the reply counter of the comment
    commentUpdated.replyCount = commentUpdated.replyCount + 1

    // getting the comments lists that have no this parent comment based on the ids
    let excludedComments = post.post_comments.comments.filter(comment => comment.id !== dataReply?.parentCommentId)

    // joining the comments with the comment in context its counter incremented
    post.post_comments.comments = [commentUpdated, ...excludedComments]

    // save the updated post with incremented comments count
    await post.save()

    // send the post object to the frontend
    res.status(200).send(post)

  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }

}

// handle getting or fetching of comment replies
export const handleGetCommentReplies = async (req, res) => {
  // extract parent comment id and user id and main post id
  const parentCommentId = req?.params?.parentCommentId
  const userId = req?.params?.userId
  const postId = req?.params?.postId

  try {
    // find user with the passedId
    const user = await personalModel.findById(userId)
    // find the post with the passed Id
    const post = await TechPostModel.findById(postId)

    // locate parent comment in the post if it exists
    const parentComment = post?.post_comments?.comments?.filter(comment => comment.id === parentCommentId)


    if (!user) {
      throw new Error("user not found!");
    }

    if (!post) {
      throw new Error("post not found!");
    }

    if (!parentComment) {
      throw new Error("parent comment not found!");
    }

    // fetch all comment replies associated with the parent comment 
    const replies = await TechPostRepliesModel.find({
      parentCommentId
    }).sort({
      createdAt: -1
    });

    // send response to the frontend
    res.status(200).send(replies)

  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }
}

// update or edit the parent comments
export const handleUpdateEditComment = async (req, res) => {
  const {
    postId,
    userId,
    commentId,
    replyText
  } = req?.body || {}

  try {
    // check exists post and user
    const user = await personalModel.findById(userId)
    const post = await TechPostModel.findById(postId)

    if (!user) {
      throw new Error("user not found!");
    }
    if (!post) {
      throw new Error("post not found!");
    }


    // filtered individual comment
    let commentUpdated = post.post_comments.comments.find(comment => comment.id === commentId)
    // updating the contents of the comment
    commentUpdated.edited = true
    commentUpdated.minimessage = replyText

    // getting the comments lists that have no this current comment based on the ids
    let excludedComments = post.post_comments.comments.filter(comment => comment.id !== commentId)

    // joining the comments
    post.post_comments.comments = [commentUpdated, ...excludedComments]

    // saving the post
    await post.save()

    // send the post object to the frontend
    res.status(200).send(post)

  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }
}

// update a reply comment
export const handleUpdateEditCommentReply = async (req, res) => {
  const {
    userId,
    commentId,
    replyText
  } = req?.body || {}

  try {
    // check exists user and comment
    const user = await personalModel.findById(userId)
    // check in the comments reply db, if the reply exists
    const comment = await TechPostRepliesModel.findById(commentId)

    // user does not exist
    if (!user) {
      throw new Error("user not found!");
    }
    // comment does not exist
    if (!comment) {
      throw new Error("comment not found!");
    }

    // update the comment details
    comment.edited = true
    comment.minimessage = replyText

    // save the comment reply with the updated details
    await comment.save()

    // fetch all comment replies associated with the parent comment 
    const replies = await TechPostRepliesModel.find({
      parentCommentId: comment.parentCommentId
    }).sort({
      createdAt: -1
    });

    // send response to the fronted
    res.status(200).send(replies)

  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }
}

// handle the update of post favorites
export const handlePostFavoriteCreate = async (req, res) => {
  try {

    const favoriteObject = req?.body || {}

    // destructuring
    const {
      postId,
      userFavoriteId
    } = favoriteObject

    // check if the user and the post really exist
    const post = await TechPostModal.findById(postId)
    const user = await personalModel.findById(userFavoriteId)

    // check if the post already exist using userId and postId
    const favorite = await PostFavorites.findOne({
      $and: [{
        postId
      }, {
        userFavoriteId
      }],
    })

    // reject request user or post doesn't exist
    if (!post || !user) {
      throw new Error('Failed to Add')
    }

    // reject request this post has already been added to favorite by the user
    if (favorite) {
      throw new Error('already added!')
    }

    // save into the database
    await PostFavorites.create(favoriteObject)

    // update the post favorites counter
    post.favorite_count = post.favorite_count + 1

    // save the updated post
    await post.save()

    // send success response
    res.status(200).send('added successfully')

  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }
}

// get all user favorite posts
export const handleGetAllFavoritePosts = async (req, res) => {
  try {
    let allFavoritePosts=[]
    // extract details from the params
    const {
      userId
    } = req?.params || {}

    // check if user exists
    const user=await personalModel.findById(userId)

    // user not exist
    if (!user) {
      throw new Error('user not found!')
    }

    // pagination related
    // extracting the query params from the frontend
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // fetch all the favorite postIds in the favorites database collection
    // const favoritePostIds=await PostFavorites.find({userFavoriteId:userId},{postId:1}).skip(skip).limit(limit)
    const favoritePostIds=await PostFavorites.find({userFavoriteId:userId},{postId:1})

    // fetch in the tech post modals all the respective postIds
    for (const favoritePost of favoritePostIds) {
      // fetching the posts
      const post=await TechPostModal.findById(favoritePost.postId)
      // appending the posts
      allFavoritePosts.push(post)
    }

    // send the response back to the frontend
    res.status(200).send(allFavoritePosts)
  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }
}

// handle deletion of favorite post
export const handleDeleteFavoritePost=async(req,res)=>{
  try {
     // extract details from the params
    const {postId,userId:userFavoriteId} = req?.params || {}

    // delete the posts
    await PostFavorites.findOneAndDelete({
      $and: [{
        postId
      }, {
        userFavoriteId
      }],
    }
    )

    // send success response
    res.status(200).send('post removed')
    
  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }
}


// delete a comment reply
export const handleDeleteCommentReply = async (req, res) => {

  try {
    // extract details from the params
    const {
      userId,
      commentId,
    } = req?.params || {}


    // check exists user and comment
    const user = await personalModel.findById(userId)

    // check in the comments reply db, if the reply exists
    const comment = await TechPostRepliesModel.findById(commentId)
    // user does not exist
    if (!user) {
      throw new Error("user not found!");
    }
    // comment does not exist
    if (!comment) {
      throw new Error("comment reply not found!");
    }

    // parent post
    const parentPost = await TechPostModal.findById(comment.parentPostId)

    // parent commentId that the reply was referencing
    const parentCommentId = comment.parentCommentId

    // updating the counters for parent comment associated with the Reply
    // also updating the general counter of the comments

    // filtered comments
    let commentsFiltered = parentPost.post_comments.comments.filter(comment => comment.id !== parentCommentId)

    // parent comment to update its counter
    let parentComment = parentPost.post_comments.comments.find(comment => comment.id === parentCommentId)

    // updating the comments before save
    parentPost.post_comments.comments = [...commentsFiltered]

    // decrement comment counts
    parentPost.post_comments.count = parentPost.post_comments.count - 1;

    // decrement the parent-comment reply comments
    parentComment.replyCount = parentComment.replyCount - 1

    // updating the comments before save
    parentPost.post_comments.comments = [parentComment, ...commentsFiltered]

    // save the updated parent post which will content updated parent comment reply count
    await parentPost.save()

    // deleting the reply  
    await TechPostRepliesModel.findByIdAndDelete(commentId)

    // fetch all comment replies associated with the parent comment 
    const replies = await TechPostRepliesModel.find({
      parentCommentId: comment.parentCommentId
    }).sort({
      createdAt: -1
    });

    // sending to the frontend response, postObject and repliesData
    let responseData = {
      parentPost,
      replies
    }

    // sending now
    res.status(200).send(responseData)

  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }

}

// delete comment of the user
export const handleDeleteUserComment = async (req, res) => {
  const {
    postId,
    userId,
    commentId
  } = req?.params || {}

  try {
    // check exists post and user
    const user = await personalModel.findById(userId)
    const post = await TechPostModel.findById(postId)

    if (!user) {
      throw new Error("user not found!");
    }
    if (!post) {
      throw new Error("post not found!");
    }

    // filtered comments
    let commentsUpdated = post.post_comments.comments.filter(comment => comment.id !== commentId)

    // parent individual comment to extract its replyCount
    let parentComment = post.post_comments.comments.find(comment => comment.id === commentId)

    // updating the comments before save
    post.post_comments.comments = [...commentsUpdated]

    // decrement the overall comment counts, comment and its sub-replies
    post.post_comments.count = post.post_comments.count - 1 - parentComment.replyCount;

    // save the post
    await post.save()

    // delete the entire replies that are associated with this parent comment too
    await TechPostRepliesModel.deleteMany({
      parentCommentId: commentId
    })

    // send the post object to the frontend
    res.status(200).send(post)

  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }

}

// get all tech posts reactions from the backend
export const handleGetAllPostsReactions = async (req, res) => {
  try {
    // use the userID against ownersIDs in the notification if match result response
    const currentUserId = req?.params?.id;

    // fetch all matching post reaction collection
    const post_reaction = await PostReactionModel.find({
      ownerId: currentUserId,
    }).sort({
      createdAt: -1
    });
    // fetch all matching comments collection etc

    // send response to the frontend
    res.status(200).send(post_reaction);
  } catch (error) {
    res
      .status(400)
      .send("something went wrong refresh the page " + error.message);
  }
};

// handle the deletion of the reaction of a given  tech post posted by the current user.
export const handleDeletePostReaction = async (req, res) => {
  const post_reactionID = req?.params.id;

  try {
    await PostReactionModel.findByIdAndDelete({
      _id: post_reactionID
    });
    res.status(200).send("Deleted Successfully");
  } catch (error) {
    res.status(400).send("Something Went Wrong " + error.message);
  }
};

// handle creation of a report about a given post due to its content being sensor
export const handleReportPostContent = async (req, res) => {
  try {
    const dataReport = req?.body;

    // check if post and also the user reporting exist in the database
    const postId = dataReport.postId;
    const reporterId = dataReport.reporterId;
    const postOwnerId = dataReport.postOwnerId;

    // check if the post in the tech post collection is exists
    const post = await TechPostModal.findById({
      _id: postId
    });
    // checks if owner exists
    const reporterUser = await personalModel.findById({
      _id: reporterId
    });
    // checks if owner exists
    const postOwner = await personalModel.findById({
      _id: postOwnerId
    });

    // post does not exist
    if (!post) {
      throw new Error("post being reported not found!");
    }
    // reporting user does not exist
    if (!reporterUser) {
      throw new Error("reporting user does not exist!");
    }

    if (!postOwner) {
      throw new Error("owner of the post does not exist!");
    }

    // update the report_post counter variable of the post in the tech post collection
    post.report_count = post.report_count + 1;

    //updating the report count value
    dataReport.report_count = post.report_count;

    // save the post with the updated counter
    await post.save();

    // everything fine lets save the new record of report to the database
    await ReportPostModal.create(dataReport);

    // send response to the frontend
    res.status(200).send("submitted successfully");
  } catch (error) {
    // debug
    console.log(error.message);
    // send the error message to the frontend
    res
      .status(400)
      .send(
        error.message?.includes("duplicate") ?
        "report already saved" :
        error.message
      );
  }
};

// handle fetching of all the posts targeting the id passed of user
export const handleGetAllPostReportUser = async (req, res) => {
  try {
    // get id passed as req params
    const ownerId = req?.params.ownerId;
    // check if the owner exists
    const postOwner = await personalModel.findById({
      _id: ownerId
    });

    if (!postOwner) {
      throw new Error("post owner does not exist!");
    }

    // fetch all post reports where owner is contains the ownerId and filter what
    // is returned: postId, post_title, report_about, report_desc, ownerViewed.
    const postReports = await ReportPostModal.find({
        postOwnerId: ownerId,
        post_owner_viewed: false,
      })
      .limit(20)
      .sort({
        updatedAt: -1
      });

    // return the results to the frontend
    res.status(200).send(postReports);
  } catch (error) {
    // debug
    console.log(error.message);
    // send error response to the frontend
    res.status(400).send(error.message);
  }
};

// handle post delete report, the owner viewed report will be updated but post report wont
// be deleted for further analysis by the technical team.
export const handlePostReportedDelete = async (req, res) => {
  try {
    const id = req?.params.id;
    // check if report id exists in the reported post collection
    const report = await ReportPostModal.findById(id);
    if (!report) {
      throw new Error("report not found!");
    }

    // report found thus update owner viewed
    await ReportPostModal.findByIdAndUpdate(id, {
      post_owner_viewed: true
    });
    // send success response to the frontend
    res.status(200).send("completed successfully");
  } catch (error) {
    // debug
    // send error to the frontend
    res.status(400).send(error.message);
  }
};