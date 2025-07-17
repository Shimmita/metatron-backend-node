import AddEventModel from "../model/AddEventModel.js";

export const handleCreateNewEvent = async (req, res) => {
  try {
    // extract the event object from the form data passed as body from frontend
    const data = req.body || {}
    
      // save the user they have no file
        await AddEventModel.create(data);

      // send the success response to the frontend
      res.status(200).send("event uploaded successfully");    
      
  } catch (error) {
    let message = `${error.message}`;
    // debug
    console.log(message)

    if (message.toLowerCase().includes("cloudinary")) {
      message = "please check your internet connection";
    } else {
      message = "something went wrong try again";
    }
    res.status(400).send(message);
  }
};

// handle getting of the events

export const handleGetAllEvents=async(req,res)=>{
  try {
    // fetch the data in db
    const eventsData=await AddEventModel.find({})

    // send the response back to the frontend
    res.status(200).send(eventsData)
    
  } catch (error) {
    // debug
    console.log(error.message)
  }
}