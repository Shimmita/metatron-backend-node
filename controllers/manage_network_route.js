import personalModel from "../model/personalModel.js";

//fetch all networks of a given user
export const handleFetchAllMyNetwork = async (req, res) => {
  //extracting the user id and array of networks id.
  const { currentUserID, networks } = req?.body;
  try {
    //check if user exists or not
    const user = await personalModel.findById(currentUserID);

    //reject request, user whom to fetch all their friends is not found
    if (!user) {
      throw new Error("user not found!");
    }

    //user exists, loop through the array and return the list of users based on projection filter
    const networkUsers = await personalModel.find(
      { _id: { $in: user.network } },
      "name specialisationTitle country county"
    );

    //send the results to the frontend
    res.status(200).send(networkUsers);
  } catch (error) {
    console.log(error.message);
    //send the error to the frontend
    res.status(400).send(error.message);
  }
};
