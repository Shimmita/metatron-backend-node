import mongoose from "mongoose";
import AddEventModel from "../model/AddEventModel.js";
import EventsRSVPModel from "../model/EventsRSVPModel.js";
import personalModel from "../model/personalModel.js";

export const handleCreateNewEvent = async (req, res) => {
  try {
    // extract the event object from the form data passed as body from frontend
    const data = req.body || {}
    
      // save the user they have no file
        const eventObject=await AddEventModel.create(data);

      // send the success response to the frontend
      res.status(200).json({
        message:"event uploaded successfully",
        data:eventObject
      });    
      
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
    // extracting the query params from the frontend
    const page = parseInt(req.query.page)+1 || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    // fetch the data in db
    const eventsData=await AddEventModel.find({})
    .sort({
      createdAt:-1
    })
    .skip(skip)
    .limit(limit)

    if (eventsData.length<1) {
      throw new Error("currently there are no more events!")
    }
    // send the response back to the frontend
    res.status(200).send(eventsData)

  } catch (error) {
    // debug
    console.log(error.message)
    res.status(400).send(error.message)
  }
}

// get top 3 events

export const handleGetTopEvents=async(req,res)=>{
  try {

    const topEvents=await AddEventModel.find({}).limit(3).sort({
      createdAt:-1
    })
    // send response back to the frontend, client
    res.status(200).send(topEvents)
    
  } catch (error) {
    // debug
    console.log(error.message)
    res.status(400).send(error.message)
  }
}


// handle getting of all events associated with a specific user
export const handleGetSpecificUserEvents=async(req,res)=>{

  try {

    const {userId}=req?.params || {}

    // check if the user exists
    const userObject=await personalModel.findById(userId)

    // user no exist
    if (!userObject) {
      throw new Error('provided user does not exist!')
    }

    // fetch all events associated with owner being userId
    const userEvents=await AddEventModel.find({
      ownerId:userId
    }).sort({
      createdAt:-1
    })
    
    // send the response back to the frontend or client
    res.status(200).send(userEvents)

  } catch (error) {
    // debug
    console.log(error.message)
    res.status(400).send(error.message)
  }
}

// handle getting of events search results
export const handleGetSearchEvents=async(req,res)=>{
  try {
    // extract the details from the req body
     const {
      job_titles = [], category, country
    } = req.body || {};

      // Validate job_titles array
    if (!Array.isArray(job_titles)) {
      throw new Error("jobs should be in array format!")
    }

     // Initialize query
    const query = {
      $and: []
    };

      // Handle job_titles search
    if (job_titles.length > 0) {
      query.$and.push({
        $or: [
          ...job_titles.map((term) => ({
            title: {
              $regex: term,
              $options: "i"
            },
          })),
          ...job_titles.map((term) => ({
            skills: {
              $elemMatch: {
                $regex: term,
                $options: "i"
              }
            },
          })),
        ],
      });
    }


    // handle category
    if (category) {
       query.$and.push({
        category: {
          $regex: category,
          $options: "i"
        },
      });
    }

    // Handle country filter
    if (country) {
      query.$and.push({
        "location.country": {
          $regex: country,
          $options: "i"
        },
      });
    }

    // Fetch jobs from the database latest first on the search results
      const searchResults = await AddEventModel.find(query).sort({
        createdAt: -1,
    });

    // send response back to the frontend
    res.status(200).json({
      message: `found ${searchResults.length} events`,
      data:searchResults
    })
    
  } catch (error) {
    // log error
    console.log(error.message)
    // send the failure to the frontend
    res.status(400).send(error.message)
  }
}


// handle getting of nearby event
export const handleGetNearbyEvents=async(req,res)=>{
  try {
   // extract the country of the user from the request body
  const {
    country
  } = req.body || {};

  // search for events where user's country is based
    const nearbyEvents = await AddEventModel.find({
      "location.country": {
        $regex: country,
        $options: "i"
      },
    }).sort({
      createdAt: -1
    });

    // send the response back to the frontend/client
    res.status(200).send(nearbyEvents)
    
  } catch (error) {
     // log error
    console.log(error.message)
    // send the failure to the frontend
    res.status(400).send(error.message)
  }
}


// handle getting of the recommended events
export const handleGetEventsRecommended=async(req,res)=>{

  try {
  // extract skills of the user from the body request
  const skills = req?.body

   // Validate job skills array
    if (!Array.isArray(skills)) {
     throw new Error('skills should be in an array format!')
    }

  // Initialize query
    const query = {
      $and: []
    };

    // handle events_skills_set search
    if (skills.length > 0) {
      query.$and.push({
        $or: [
          ...skills.map((term) => ({
            skills: {
              $elemMatch: {
                $regex: term,
                $options: "i"
              }
            },
          })),
        ],
      });
    }

     // fetch events from the database latest first on the search results
      const searchResults = await AddEventModel.find(query).sort({
        createdAt: -1,
      });

    // send response to the frontend or the client
    res.status(200).send(searchResults)

  } catch (error) {
       // log error
    console.log(error.message)
    // send the failure to the frontend
    res.status(400).send(error.message)
  }
}

// handle creation of event rsvp
export const handleCreateEventRSVP=async(req,res)=>{
  try {
    // getting data from the body request
    const data=req?.body || {}

    // destructuring essential info from data
    const {userId,eventId}=data

    // search the event, update the no of rsvp made by users
    let eventObject=await AddEventModel.findById(eventId)

      if (!eventObject) {
        throw new Error("your event does not exist!")
      }

      // owner of the event can't rsvp themselves
      if (eventObject.ownerId===userId) {
        throw new Error("you can't rsvp your own event!")
      }

      // check if user made rsv on the event previously
      const previousRSVP = await EventsRSVPModel.findOne({
            $and: [{
              eventId
            }, {
              userId
            }],
          })

      if (previousRSVP) {
        throw new Error("event exists in your rsvp!")
      }

      // saving the body request in the db
      await EventsRSVPModel.create(data)

    // update the number of users who made the rsvp on events Item
    eventObject.users.count=eventObject.users.count+1

    // pushing the userId make rsvp in the list of values of users
    eventObject.users.value=[...eventObject.users.value,userId]

    // save the eventItem with the updated changes
    eventObject.save()
   
    // sending the success response to the frontend/client
    res.status(200).json({
      message:'RSVP made successfully!',
      data:eventObject
    })    
  } catch (error) {
    // log error
    console.log(error.message)
    // send the failure to the frontend
    res.status(400).send(error.message)
  }
}

// handle getting of all events rsvp
export const handleGetEventRSVP=async(req,res)=>{
  try {
    // destructuring the userId from the req params
    const {userId}=req?.params
    // temp eventsResults
    let tempEvents=[]

    // fetch event rsvp made by this userId
    const rsvpAll=await EventsRSVPModel.find({userId})

    // loop through events
    for (const rsvp of rsvpAll) {
      const currentId=rsvp.eventId;
      const actualEvent=await AddEventModel.findById(currentId).sort({createdAt:-1})

      // pushing it to the tempEvents
      tempEvents=[...tempEvents,actualEvent]
    }

    // returning element to the frontend/client
    res.status(200).send(tempEvents)

  } catch (error) {
        // log error
    console.log(error.message)
    // send the failure to the frontend
    res.status(400).send(error.message)
  }
}

// handle getting of event stats by admin,owner
export const handleGetEventStats=async(req,res)=>{
  try {
    // extract details from params
    const {eventId}=req?.params

    // fetch all events rsvp where eventId matches
    const eventRSVP=await EventsRSVPModel.find({
      eventId
    }).sort({
      createdAt:-1
    })

    // return the response to frontend/client
    res.status(200).send(eventRSVP)

  } catch (error) {
    // log error
    console.log(error.message)
    // send the failure to the frontend
    res.status(400).send(error.message)
  }
}

// handle deletion of an rsvp
export const handleDeletionRSVP=async(req,res)=>{
  try {
    // destructure values from req params
    const {eventId,userId}=req?.params
    
      // search the event
    let eventObject=await AddEventModel.findById(eventId)

    // check if user made rsv on the event previously
    await EventsRSVPModel.findOneAndDelete({
            $and: [{
              eventId
            }, {
              userId
            }],
          })

    // decrement the counter of user rsvp, also remove userId from
    // values
    eventObject.users.count=eventObject.users.count-1
    eventObject.users.value=[...eventObject.users.value.filter((value)=>value!==userId)]
    // save the eventObject with updated changes
    await eventObject.save()

    // begin refetch of events made by the userId and send back to the frontend,
    // redo on get rsvp.
     // temp eventsResults
    let tempEvents=[]

    // fetch event rsvp made by this userId
    const rsvpAll=await EventsRSVPModel.find({userId})

    // loop through events
    for (const rsvp of rsvpAll) {
      const currentId=rsvp.eventId;
      const actualEvent=await AddEventModel.findById(currentId).sort({createdAt:-1})

      // pushing it to the tempEvents
      tempEvents=[...tempEvents,actualEvent]
    }

    // returning element to the frontend/client
    res.status(200).json({
      message:"RSVP deleted successfully!",
      data:tempEvents
    })
    
  } catch (error) {
    // log error
    console.log(error.message)
    // send the failure to the frontend
    res.status(400).send(error.message)
  }
}


// handle delete of owner event
export const handleDeleteMyEvent=async(req,res)=>{
  try {
    // destructure value from req params
    const {eventId,userId}=req?.params
    // casting the eventId into types ID
   let castedEventId=new mongoose.Types.ObjectId(eventId)

  //  deleting the associated event
   await AddEventModel.findByIdAndDelete(castedEventId)

  // delete all rsvp related to this eventId
  await EventsRSVPModel.deleteMany({
    eventId
  })

  // fetch all events associated with owner being userId,
  // and send the response back to the frontend
    const userEvents=await AddEventModel.find({
      ownerId:userId
    }).sort({
      createdAt:-1
    })

  // sending response to the client
  res.status(200).json({
    message:'event deleted successfully!',
    data:userEvents
  })
    
  } catch (error) {
     // log error
    console.log(error.message)
    // send the failure to the frontend
    res.status(400).send(error.message)
  }
}