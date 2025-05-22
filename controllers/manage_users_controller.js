import mongoose from "mongoose";
import personalModel from "../model/personalModel.js";

// controls sending the request to the deployed Ai model for response
export const handleGetSpecificUser = async (req, res) => {
  try {
    // extract the id passed in req
    const userId = new mongoose.Types.ObjectId(req?.params.id);
    // no id
    if (!userId) {
      throw new Error('something went wrong')
    }

    // look for a user with the matching id and return
    const user = await personalModel.findById({
      _id: userId && userId
    }, {
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
    });

    // no user
    if (!user) {
      throw new Error(
        "user not found!"
      );
    }

    // return the results to the frontend
    res.status(200).send(user);
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

// handle updating of the user
export const handleUserUpdateDetails = async (req, res) => {
  try {
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
    } = userDetails;

    // user and iD present lets check user
    const user = await personalModel.findById(userID);

    // user not available
    if (!user) {
      throw new Error("user does not exist");
    }

    // compare the details if they same leave else update.
    const {
      about: userAbout,
      selectedSkills: userSkills,
      specialisationTitle: userSpecialisation,
      phone: userPhone,
      country: userCountry,
      county: userCounty,
    } = user;

    // update only changes
    if (
      userAbout === about &&
      specialisationTitle === userSpecialisation &&
      phone === userPhone &&
      country === userCountry &&
      county === userCounty &&
      selectedSkills.join() === userSkills.join()
    ) {
      throw new Error("no changes to update");
    }

    // update the details that contains any changes
    user.about = about;
    user.specialisationTitle = specialisationTitle;
    user.phone = phone;
    user.country = country;
    user.county = county;
    user.selectedSkills = selectedSkills;

    // if no file save the data directly to the database
    if (!req.file) {
      await user.save();
    }

    // send the response to the frontend
    res
      .status(200)
      .send({
        message: "changes updated successfully",
        data: user
      });
  } catch (error) {
    // debug
    console.log(error.message);
    // send error message to the frontend
    res.status(400).send(error.message);
  }
};