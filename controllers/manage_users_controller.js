import bcrypt from "bcrypt";
import mongoose from "mongoose";
import personalModel from "../model/personalModel.js";
import ProfileViewerModel from "../model/ProfileViewerModel.js";
import TechPostModel from "../model/TechPostModel.js";
import {
  uploadToCloudinary
} from "../utils/cloudinary.js";
import {
  CompressImageFunction
} from "../utils/compressImage.js";


// controls sending the request to the deployed Ai model for response
export const handleGetSpecificUser = async (req, res) => {
  try {
    // extract the id passed in req
    const userId = new mongoose.Types.ObjectId(req?.params.id);
    // extract the senderId from the params
    const senderId = new mongoose.Types.ObjectId(req?.params.senderId);
    // no id
    if (!userId) {
      throw new Error('something went wrong')
    }

    // no senderId 
    if (!senderId) {
      throw new Error('something went wrong')
    }

    // check if user is online in the session collection, if their userID exists means true
    // Query the session  for the given userID
    // 'session' is the default field where session data is stored
    const sessionExists = await mongoose.connection
      .collection("sessions")
      .findOne({
        "session.userID": userId,
      });


    // look for a user with the matching id and return
    const user = await personalModel.findById(userId, {
      avatar:1,
      name: 1,
      specialisationTitle: 1,
      country: 1,
      county: 1,
      selectedSkills: 1,
      network_count: 1,
      createdAt: 1,
      network: 1,
      email: 1,
      phone: 1,
      about: 1,
      linkedin: 1,
      portfolio: 1,
      gitHub: 1
    });

    // no user
    if (!user) {
      throw new Error(
        "user not found!"
      );
    }

    // look in the personals db and fetch the user details matching
    // the profile viewer model
    const userViewing = await personalModel.findById(senderId)

    // sender not found probably their id not present
    if (!userViewing) {
      throw new Error('user not found!')
    }

    // check if the exact senderId and userId already present in profile viewer  db
    const requestObject = await ProfileViewerModel.findOne({
      $and: [{
        targetId: userId
      }, {
        senderId
      }],
    });

    // if senderId and userId the same return since its user viewing their own profile
    if (userId.equals(senderId)) {
      // return the results to the frontend; isOnline and user
      res.status(200).send({
        isOnline: sessionExists ? true : false,
        user
      });

      return
    }

    // same user targeting same target already has the previous view in the db
    if (requestObject) {
      res.status(200).send({
        isOnline: sessionExists ? true : false,
        user
      });

      return
    }

    // save the details of the current user viewing the profile in the profile
    // viewers db
    await ProfileViewerModel.create({
      senderId,
      targetId: userId,
      avatar: userViewing?.avatar,
      title: userViewing?.specialisationTitle,
      name: userViewing?.name,
      country: userViewing?.country,
      state: userViewing?.county
    })

    // return the results to the frontend; isOnline and user
    res.status(200).send({
      isOnline: sessionExists ? true : false,
      user
    });

  } catch (error) {
    console.log(error)
    res.status(400).send(error.message);
  }
};

// handle getting online status of the user
export const handleGetUserIsOnline = async (req, res) => {
  try {
    const userID = new mongoose.Types.ObjectId(req?.params.userID);

    // check if user is online in the session collection, if their userID exists means true
    // Query the session  for the given userID
    // 'session' is the default field where session data is stored
    const sessionExists = await mongoose.connection
      .collection("sessions")
      .findOne({
        "session.userID": userID,
      });

    if (sessionExists) {
      // session exists user is online
      res.status(200).send({
        isOnline: true
      });
    } else {
      // session does not exist user is offline
      res.status(200).send({
        isOnline: false
      });
    }
  } catch (error) {
    // debug
    console.log(error.message);

    // send error message to the frontend
    res.status(400).send(error.message);
  }
};

// handle getting of the search results
export const handleGetSearchingUser = async (req, res) => {
  try {
    // get search from request query
    const search = req.query.search || "";

    // finding matching user query under case insensitive regex
    // Return up to 3 results
    const users = await personalModel
      .find({
        name: {
          $regex: search,
          $options: "i"
        },
      })
      .limit(3);

    res.status(200).json(users);
  } catch (err) {
    // debug
    console.log(err.message);
    res.status(400).send("something went wrong!");
  }
};

// handle getting of all profile views targeting specific user
export const handleGettingProfileViews = async (req, res) => {
  // const userID from params
  const userID = req?.params?.userId;

  try {

    // fetch user details in db
    const user = await personalModel.findById(userID)

    // user not found
    if (!user) {
      throw new Error('user not found!')
    }

    // fetch in the profile views db where target user is with the userID
    const profileViewers = await ProfileViewerModel.find({
      targetId: userID
    })

    // return the response to the frontend
    res.status(200).send(profileViewers)

  } catch (err) {
    // debug
    console.log(err.message);
    res.status(400).send("something went wrong!");
  }
};

// delete or clear profile_view
export const handleDeleteProfileView = async (req, res) => {
  // extract profile view id from the params
  const {
    viewId
  } = req?.params || {}

  try {

    // delete the profile_view by passing the id
    await ProfileViewerModel.findByIdAndDelete(viewId)

    // send success response to the frontend or client
    res.status(200).send('cleared successfully')

  } catch (error) {
    // debug
    console.log(error)
    // send the fail response to the frontend/client
    res.status(400).send(error?.message)
  }
}

// handle updating of the user
export const handleUserUpdateDetails = async (req, res) => {
  try {
    let newHashedPassword = ''
    // const userID from params
    const userID = req?.params.id;
    // Parse the user object from the request body
    const userDetails = JSON.parse(req.body?.user);
    // destructuring the user object to get passed data
    const {
      about,
      selectedSkills,
      specialisationTitle,
      phone,
      country,
      county,
      gitHub,
      portfolio,
      linkedin,
      oldPassword,
      newPassword
    } = userDetails;

    // user present lets check user
    const user = await personalModel.findById(userID);


    // user not available
    if (!user) {
      throw new Error("user does not exist");
    }

    // extract the password
    const {
      password: userPassword
    } = user;


    // password passed from the client
    if (oldPassword?.length > 5 && newPassword?.length > 5) {

      // check if old and user current passwords match
      if (await bcrypt.compare(oldPassword, userPassword)) {
        //hash the new password being passed
        newHashedPassword = await bcrypt.hash(newPassword, 10)
        // update the user password
        user.password = newHashedPassword
      } else {
        // error incorrect passwords
        throw new Error("provided incorrect password!")
      }

    }

    // update the details that contains any changes
    user.about = about;
    user.specialisationTitle = specialisationTitle;
    user.phone = phone;
    user.country = country;
    user.county = county;
    user.linkedin = linkedin;
    user.gitHub = gitHub;
    user.portfolio = portfolio;
    user.selectedSkills = selectedSkills;

    // if no file save the data directly to the database
    if (!req.file) {

      // update user posts details to reflect changes
      // no user avatar to update since file not present
      await updateUserPosts(userID, '')

      // save the updated user changes
      await user.save();

      // update user posts details to reflect changes
      // avatar updated
      await updateUserPosts(userID, user)

      // send the response to the frontend
      res.status(200).send({
        message: "changes updated successfully",
        data: user
      });
    } else {

      // Compress and convert the image to AVIF format
      const compressedImageBuffer = await CompressImageFunction(req.file.buffer)

      // Upload the compressed AVIF image to Cloudinary
      const result = await uploadToCloudinary(
        compressedImageBuffer,
        process.env.CLOUDINARY_POST_IMAGES_FOLDER
      );

      // getting  avatar url and ID from the result of cloudinary upload

      const avatar = result.secure_url;
      const avatarID = result.public_id;

      // update the user avatar and avatarID.
      user.avatar = avatar
      user.avatarID = avatarID

      // save the details
      await user.save()

      // update user posts details to reflect changes
      // avatar updated
      await updateUserPosts(userID, user)

      // return the success response to the frontend
      res.status(200).send({
        message: "changes updated successfully",
        data: user
      });
    }


  } catch (error) {
    const errorMessage = error.message
    // debug
    console.log(errorMessage);
    if (errorMessage.includes("api.cloudinary.com")) {
      // send error message to the frontend
      res.status(400).send('check your internet connection!');
    } else {
      // send error message to the frontend
      res.status(400).send('something went wrong!');
    }

  }
};


// updates any user posts data
const updateUserPosts = async (userId, user) => {
  if (!user) {
    return
  }

  // user specific post data
  const userPosts = await TechPostModel.find({
    'post_owner.ownerId': userId
  })

  // user has post(s)
  if (userPosts) {

    //  update these user post attributes
    // owner title,avatar,skills | post location (country and states) | post comment and replies
    for (const element of userPosts) {

      // current post to update
      await TechPostModel.findByIdAndUpdate(element.id, {
        'post_owner.owneravatar': user?.avatar,
        'post_owner.ownertitle': user?.specialisationTitle,
        'post_owner.ownerskills': user?.selectedSkills,
        'post_location.country': user?.country,
        'post_location.state': user?.county

      })
    }
  }

  // all posts so that could update any of user's comments details
  const allPosts = await TechPostModel.find({})
  // post present
  if (allPosts) {
    // loop through each post
    for (const post of allPosts) {
      // current post
      const currentPost = await TechPostModel.findById(post.id)
      // get all user comments
      const userComments = currentPost.post_comments.comments.filter(comment => comment.userId === userId)
      // loop through the array of comments and updating user details     
      for (const comment of userComments) {
        comment.title = user?.specialisationTitle
        comment.country = user?.country
        comment.avatar = user?.avatar
      }
      // update the user comments and outdo the previously user comments
      currentPost.post_comments.comments = [...userComments, ...currentPost.post_comments.comments.filter(comment => comment.userId !== userId)]
      // save the post
      await currentPost.save()
    }
  }





}