import {
  createClient
} from "@supabase/supabase-js";
import mongoose from "mongoose";
import sharp from "sharp";
import JobFeedBackModal from "../model/JobFeedBackModal.js";
import JobPostModel from "../model/JobPostModel.js";
import JobsAppliedModel from "../model/JobsAppliedModel.js";
import personalModel from "../model/personalModel.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary
} from "../utils/cloudinary.js";

// supabase constants
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE = createClient(SUPABASE_URL, SUPABASE_KEY);
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET

// cloudinary init
const CLOUDINARY_POST_IMAGES_PATH = process.env.CLOUDINARY_POST_IMAGES_PATH


// creating of new post
export const handleCreateJob = async (req, res) => {
  try {
    // extract the post object from the form data passed as body from frontend
    const data = JSON.parse(req?.body.job);

    //   check if job has file
    if (req?.file) {
      // Compress and convert the image to AVIF format
      const compressedImageBuffer = await sharp(req.file.buffer)
        .resize({
          width: 500
        }) // Resize to a max width of 500px
        .toFormat("webp", {
          quality: 80
        }) // Convert to webp with 80% quality
        .toBuffer();

      // Upload the compressed AVIF image to Cloudinary
      const result = await uploadToCloudinary(
        compressedImageBuffer,
        CLOUDINARY_POST_IMAGES_PATH
      );

      // getting avatar url and ID from the result of cloudinary upload
      const logo = result.secure_url;
      const logoID = result.public_id;
      await JobPostModel.create({
        ...data,
        logo,
        logoID
      });
      res.status(200).send("post upload successful");
    } else {
      // save job no file especially uploaded logo
      await JobPostModel.create(data);

      // fetch top 4 jobs and send to the frontend to update the top jobs,
      // suppose the user was in hr page, all jobs will be fetched automatically so no need.
      res.status(200).send("job upload successful");
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

// get all jobs
export const handleGetAllJobs = async (req, res) => {

  try {

    // extract userId passed in the params
    const {userId } = req?.params || {}

    // extracting the query params from the frontend
    const page = parseInt(req.query.page)+1 || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    // sort them the latest first
    const allJobs = await JobPostModel.find({})
      .sort({
        createdAt: -1
      })
      .skip(skip)
      .limit(limit);
    // no more jobs posted
    if (!allJobs.length) {
      throw new Error(
        "You have reached the end of job listings and currently there are no more jobs!"
      );
    }

    // fetch in the applied jobs, those containing the userId
    // will help to match if a particular top job is applied.
    const jobsUserApplied = await JobsAppliedModel.find({
      "applicant.applicantID": userId
    }, {
      applicant: 0,
      cvLink: 0,
      viewed: 0,
      createdAt: 0,
      updatedAt: 0
    })

    // updating the jobs if current user applied or not
    let checkedJobs = allJobs.map((main_job) => {
      for (const element of jobsUserApplied) {
        if (main_job.id === element.jobID) {
          main_job.currentUserApplied = true
        }
      }

      return main_job
    })

    // jobs present
    res.status(200).send(checkedJobs);

  } catch (error) {
    // send error to the frontend
    res.status(400).send(error.message);
  }
};

// handle get all jobs posted by the hiring manager
export const handleGetAllJobsHiring = async (req, res) => {

  // extract userId passed in the params
  const {
    emailId
  } = req?.params || {}


  try {
    // sort them the latest first
    const allJobs = await JobPostModel.find({
        my_email: emailId
      })
      .sort({
        createdAt: -1
      })
      .limit(20);

    // no jobs posted
    if (!allJobs) {
      throw new Error(
        "currently there are no jobs."
      );
    }

    // jobs present
    res.status(200).send(allJobs);

  } catch (error) {
    // debug
    console.log(error);

    // send error to the frontend
    res.status(400).send(error.message);
  }
};


// handle fetching of applicants of a specific job
export const handleGetJobApplicantsHiring = async (req, res) => {
  // extract userId passed in the params
  const {
    emailId,
    jobId
  } = req?.params || {}

  try {

    // check if user the hiring manager and job posted exists
    const user = await personalModel.findOne({
      email: emailId
    })
    const job = await JobPostModel.findById(jobId)

    // user not found
    if (!user) {
      throw new Error('hiring manager not found!')
    }

    // job not found
    if (!job) {
      throw new Error('job not found!')
    }

    // locate in the jobs applied, any with the job ID
    const jobApplicants = await JobsAppliedModel.find({
      jobID: jobId
    })


    // send the response to the frontend
    res.status(200).send(jobApplicants)

  } catch (error) {
    console.log(error)
    res.status(400).send(error?.message)
  }

}

// handle updating of the job application status
export const handleUpdateJobApplicationStatusHiring = async (req, res) => {
  // extract userId passed in the params
  const {
    emailId,
    jobId,
  } = req?.params || {}

  //  extract the status text from the body request
  const {
    statusText,
    jobApplicationID,
    applicantID
  } = req?.body || {}


  try {

    // check if user the hiring manager and job posted exists
    const user = await personalModel.findOne({
      email: emailId
    })

    const parentJob = await JobPostModel.findById(jobId)

    // user not found
    if (!user) {
      throw new Error('hiring manager not found!')
    }

    // job not found
    if (!parentJob) {
      throw new Error('job not found!')
    }


    // locate the specific job to update its status
    const jobToUpdate = await JobsAppliedModel.findById(jobApplicationID)


    // fetch in jobFeedBack if the jobTitle and TargetUserId are already
    const jobFeedBackResult = await JobFeedBackModal.findOne({
      $and: [{
        targetId: applicantID
      }, {
        title: parentJob?.title
      }],
    })

    // true cv viewed
    jobToUpdate.viewed = true

    // update status tex
    jobToUpdate.status = statusText

    // update the job assessed counter on the main job
    parentJob.applicants.assessed = parentJob.applicants.assessed + 1

    // save the updated job
    await jobToUpdate.save()

    // save the parent job changes
    await parentJob.save()

    // create the job feedBack db if it does not exist for this target user and specific job title
    if (!jobFeedBackResult) {
      await JobFeedBackModal.create({
        avatar: parentJob?.logo || parentJob?.logoID,
        country: parentJob?.location?.country,
        state: parentJob?.location.state,
        name: parentJob?.organisation?.name,
        title: parentJob?.title,
        targetId: applicantID,
      })
    }


    // send the response of status to the frontend
    res.status(200).send(jobToUpdate.status)

  } catch (error) {
    // debug
    console.log(error)
    // send error response to the client
    res.status(400).send(error?.message)
  }

}


// handle updating of job status posted by the hr
export const handleUpdateJobStatusHiring = async (req, res) => {
  // extract userId passed in the params
  const {
    emailId,
    jobId,
  } = req?.params || {}

  //  extract the status text from the body request
  const {
    statusText,
  } = req?.body || {}


  try {
    // check if user the hiring manager and job posted exists
    const user = await personalModel.findOne({
      email: emailId
    })

    const job = await JobPostModel.findById(jobId)

    // user not found
    if (!user) {
      throw new Error('hiring manager not found!')
    }

    // job not found
    if (!job) {
      throw new Error('job not found!')
    }

    // update the job status
    job.status = statusText

    // save 
    await job.save()

    // fetch all jobs of the hiring manager 
    const allJobs = await JobPostModel.find({
        my_email: emailId
      })
      .sort({
        createdAt: -1
      })
      .limit(20);

    // send the response back to the frontend. all jobs posted
    // including the updated one to refresh the entire UI or client side
    // consider redux mechanism of updating the affected job only.

    res.status(200).send(allJobs)
  } catch (error) {
    // debug
    console.log(error)

    // send error response to the client
    res.status(400).send(error?.message)
  }

}


// update the entire job details
export const handleUpdateEntireJobHiring = async (req, res) => {

  try {
    // extract userId passed in the params
    const {
      emailId,
      jobId,
    } = req?.params || {}


    // extract the job object from the  body
    const data = req?.body || {}

    // check if user the hiring manager and job posted exists
    const user = await personalModel.findOne({
      email: emailId
    })

    const job = await JobPostModel.findById(jobId)

    // user not found
    if (!user) {
      throw new Error('hiring manager not found!')
    }

    // job not found
    if (!job) {
      throw new Error('job not found!')
    }

    // it has no file in the body

    // update the job
    await JobPostModel.findByIdAndUpdate(jobId, {
      ...data
    })

    // fetch all jobs sort them the latest first, send to the client, contains updated jobs
    const allJobs = await JobPostModel.find({
        my_email: emailId
      })
      .sort({
        createdAt: -1
      })
      .limit(20);

    // sending
    res.status(200).send(allJobs)

  } catch (error) {
    // debug
    console.log(error)

    // send error response to the client
    res.status(400).send(error?.message)
  }
}

// delete the job of the user
export const handleDeleteJobPostHiring = async (req, res) => {
  // extract userId passed in the params
  const {
    emailId,
    jobId
  } = req?.params || {}

  try {

    // check if user the hiring manager and job posted exists
    const user = await personalModel.findOne({
      email: emailId
    })

    const job = await JobPostModel.findById(jobId)

    // user not found
    if (!user) {
      throw new Error("hiring manager not found!")
    }

    // job not found
    if (!job) {
      throw new Error("job post not found!")
    }


    // check if logoId is present means job logo was uploaded to cloud, delete it
    if (job.logoID || job.logo.includes("https:")) {
      await deleteFromCloudinary(job.logoID)
    }


    // loop in the jobsApplied model and locate those with the job Id
    // and update that isAvailable to false
    await JobsAppliedModel.updateMany({
      jobID: jobId
    }, {
      isAvailable: false
    })

    // delete the job now
    await JobPostModel.findByIdAndDelete(jobId)


    // send the status to the frontend
    res.status(200).send('job deleted successfully')
    

  } catch (error) {

    // debug
    console.log(error)

    // send error response to the client
    res.status(400).send(error?.message)
  }
}


// download user cv by the owners
export const handleDownloadMyCV=async(req,res)=>{
  try {
    // extract cvName passed in the params
    const {cvName}=req?.body 
    if (!cvName) {
      throw new Error("cvName missing in the body request")
    }

    // supabase operation to get the signed url that lasts for 60 seconds
    const {
      data,
      error
    } = await SUPABASE.storage.from(SUPABASE_BUCKET).createSignedUrl(cvName, 60);

    // error 
    if (error) throw new Error(error);

    // send the signed url back to the frontend
    res.status(200).send(data.signedUrl);

  } catch (error) {
     // debug
    console.log(error)

    // send error response to the client
    res.status(400).send(error?.message)
  }
}

// download the cv of the user by the hiring manager
export const handleDownloadDocumentHiring = async (req, res) => {
  // extract emailId and jobId passed in the params
  const {
    emailId,
    jobId
  } = req?.params || {}

  const {
    cvName
  } = req?.body || {}

  try {
    // check if user the hiring manager and job posted exists
    const user = await personalModel.findOne({
      email: emailId
    })

    const job = await JobPostModel.findById(jobId)

    // user not found
    if (!user) {
      throw new Error('hiring manager not found!')
    }

    // job not found
    if (!job) {
      throw new Error('job not found!')
    }

    // supabase operation to get the signed url that lasts for 60 seconds
    const {
      data,
      error
    } = await SUPABASE.storage.from(SUPABASE_BUCKET).createSignedUrl(cvName, 60);
    if (error) throw new Error(error);

    // send the signed url back to the frontend
    res.status(200).send(data.signedUrl);

  } catch (error) {
    // debug
    console.log(error)

    // send error response to the client
    res.status(400).send(error?.message)
  }
}


// handle delete my job application
export const handleDeleteMyJobApplication = async (req, res) => {

  try {


  // extract userId passed in the params
  const {
    userId,
    jobAppID,
    gender,
  } = req?.params || {}


    // fetch an exact match in jobs applied by user model such that
    // the userId =>applicantID and jobAppID =>jobID
    const jobApplication = await JobsAppliedModel.findOne({
      $and: [{
        "applicant.applicantID": userId
      }, {
        jobID: jobAppID
      }],
    })

      // update the target job its respective applicants info.
      const jobTarget = await JobPostModel.findById(jobAppID);

      // reject the application process
      if (!jobTarget) {
        throw new Error("job does not exist");
      }


    // job not exist
    if (!jobApplication) {
      throw new Error("something went wrong, application not found!")
    }

    // reduce the number of applicants and the gender of the user too
    
      let {
        total,
        male,
        female,
        other
      } = jobTarget.applicants;

      if (total>0||male>0||female>0||other>0) {
        // decrement total
        jobTarget.applicants.total = total - 1;

      // decrement male, female and other counts
      if (gender === "Male") {
        // male
        jobTarget.applicants.male = male - 1;
      } else if (gender === "Female") {
        // female
        jobTarget.applicants.female = female - 1;
      } else {
        // other gender
        jobTarget.applicants.other = other - 1;
      }
      }

      // save the target and updated job results
      await jobTarget.save();

    //  delete in mongodb the metadata
    await JobsAppliedModel.findOneAndDelete({
      $and: [{
        "applicant.applicantID": userId
      }, {
        jobID: jobAppID
      }],
    })

    // send the success response back to the frontend
    res.status(200).send('deleted successfully')

  } catch (error) {
    // debug
    console.log(error)

    // send error response to the client
    res.status(400).send('something went wrong!')
  }

}


// handle getting of jobs applied by the user
export const handleGetMyJobApplications = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}

  try {
    // fetch in the applied jobs, those containing the userId
    // will help to match if a particular top job is applied.
    const jobsUserApplied = await JobsAppliedModel.find({
      "applicant.applicantID": userId
    }, {
      applicant: 0,
      cvLink: 0,
      viewed: 0,
      createdAt: 0,
      updatedAt: 0
    })

    // all jobs  db fetch
    const allJobs = await JobPostModel.find({})

    // looping through the jobs to identify those user applied
    let appliedJobs = allJobs.filter((main_job) => {

      for (const element of jobsUserApplied) {
        if (main_job.id === element.jobID) {
          main_job.currentUserApplied = true
          return main_job

        }
      }

    })

    // jobs present
    res.status(200).send(appliedJobs);

  } catch (error) {
    console.log(error)
    res.status(400).send(error.message);
  }
}


// handle get job stats of the user
export const handleGetMyJobStats = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}

  try {

    // fetch in the applied jobs, those containing the userId
    // will help to match if a particular top job is applied.
    const jobsUserApplied = await JobsAppliedModel.find({
      "applicant.applicantID": userId
    }, {
      applicant: 0,
      updatedAt: 0
    })

    // all jobs  db fetch
    const allJobs = await JobPostModel.find({})

    // looping through the jobs to identify those user applied
    let appliedJobs = allJobs.filter((main_job) => {

      for (const element of jobsUserApplied) {
        if (main_job.id === element.jobID) {
          // user applied the job
          main_job.currentUserApplied = true
          // their cv was viewed by the hiring team
          main_job.viewedCV = element.viewed
          // the link to cv
          main_job.cvLink = element.cvLink
          // date of application
          main_job.dateApplied = element.createdAt

          // status from hr
          main_job.status = element.status

          // return the job 
          return main_job

        }
      }

    })

    console.log(appliedJobs)

    // jobs present
    res.status(200).send(appliedJobs);

  } catch (error) {
    console.log(error)
    res.status(400).send(error.message);
  }
}




// handle getting of the recommended jobs
export const handleGetRecommended = async (req, res) => {

  try {

      // extract userId passed in the params
  const {
    userId
  } = req?.params || {}

  // extract skills of the user from the body request
  const job_skills = req?.body

  

    // Validate job skills array
    if (!Array.isArray(job_skills)) {
      return res.status(400).send("skills should be an array");
    }

    // Initialize query
    const query = {
      $and: []
    };

    // handle job_skill-set search
    if (job_skills.length > 0) {
      query.$and.push({
        $or: [
          ...job_skills.map((term) => ({
            title: {
              $regex: term,
              $options: "i"
            },
          })),
          ...job_skills.map((term) => ({
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


    // fetch jobs from the database latest first on the search results
    const searchResults = await JobPostModel.find(query).sort({
      createdAt: -1,
    });


    // fetch in the applied jobs, those containing the userId
    // will help to match if a particular top job is applied.
    const jobsUserApplied = await JobsAppliedModel.find({
      "applicant.applicantID": userId
    }, {
      applicant: 0,
      cvLink: 0,
      viewed: 0,
      createdAt: 0,
      updatedAt: 0
    })

    // updating the jobs if current user applied or not
    let checkedJobs = searchResults.map((main_job) => {
      for (const element of jobsUserApplied) {
        if (main_job.id === element.jobID) {
          main_job.currentUserApplied = true
        }
      }

      return main_job
    })

    // jobs present
    res.status(200).send(checkedJobs);

  } catch (error) {
    console.log(error)
    res.status(400).send(error.message);
  }

}

// get top 5 jobs that are latest
export const handleGetTopJobs = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}

  try {
    // sort them the latest first, exclude phone and email attached
    const latestJobs = await JobPostModel.find({}, {
        my_phone: 0,
        data_email: 0,
      })
      .sort({
        createdAt: -1
      })
      .limit(3);

    // fetch in the applied jobs, those containing the userId
    // will help to match if a particular top job is applied.
    const jobsUserApplied = await JobsAppliedModel.find({
      "applicant.applicantID": userId
    }, {
      applicant: 0,
      cvLink: 0,
      viewed: 0,
      createdAt: 0,
      updatedAt: 0
    })

    // updating the jobs if current user applied or not
    let checkedJobs = latestJobs.map((main_job) => {
      for (const element of jobsUserApplied) {
        if (main_job.id === element.jobID) {
          main_job.currentUserApplied = true
        }
      }

      return main_job
    })

    // jobs present
    res.status(200).send(checkedJobs);

  } catch (error) {
    console.log(error)
    res.status(400).send(error.message);
  }

};


// get all job feedback
export const handleGetAllJobFeedBack = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}

  try {

    // get job feedbacks from the db matching the target user
    const jobFeedBacks = await JobFeedBackModal.find({
      targetId: userId
    })

    // send the response to the frontend
    res.status(200).send(jobFeedBacks)

  } catch (error) {
    // debug
    console.log(error)
    // send the error response to client
    res.status(400).send(error.message);
  }

};


// delete a job feedback
export const handleDeleteJobFeedBack = async (req, res) => {

  // extract the job feedback id from the params 
  const {
    feedId
  } = req?.params || {}

  try {

    // delete by Id
    await JobFeedBackModal.findByIdAndDelete(feedId)

    // send the response
    res.status(200).send('cleared successfully')

  } catch (error) {
    // debug
    console.log(error)
    // send the error response
    res.status(400).send(error?.message)
  }


}


// get verified jobs only
export const handleGetVerifiedJobs = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}


  try {
    const allJobs = await JobPostModel.find({
      $or: [{
        website: ""
      }, {
        website: null
      }],
    }).sort({
      createdAt: -1
    }).limit(24);
    // no jobs posted
    if (allJobs.length < 0) {
      throw new Error("currently there are no jobs, when jobs are populated from recruiters this page will be ready.");
    }

    // fetch in the applied jobs, those containing the userId
    // will help to match if a particular top job is applied.
    const jobsUserApplied = await JobsAppliedModel.find({
      "applicant.applicantID": userId
    }, {
      applicant: 0,
      cvLink: 0,
      viewed: 0,
      createdAt: 0,
      updatedAt: 0
    })

    // updating the jobs if current user applied or not
    let checkedJobs = allJobs.map((main_job) => {
      for (const element of jobsUserApplied) {
        if (main_job.id === element.jobID) {
          main_job.currentUserApplied = true
        }
      }

      return main_job
    })

    // jobs present
    res.status(200).send(checkedJobs);

  } catch (error) {
    console.log(error)
    res.status(400).send("something went wrong");
  }
};


// handle getting of external jobs, jobs with external website
export const handleGetExternalJobs = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}


  try {

    // temp array for holding jobs with website
    let allJobsWebsite=[]


    const tempJobs = await JobPostModel.find({}).sort({
      createdAt: -1
    }).limit(24);

    // no jobs posted
    if (tempJobs.length < 0) {
      throw new Error("currently there are no jobs, when jobs are populated from recruiters this page will be ready.");
    }


    // fetch in the applied jobs, those containing the userId
    // will help to match if a particular top job is applied.
    const jobsUserApplied = await JobsAppliedModel.find({
      "applicant.applicantID": userId
    }, {
      applicant: 0,
      cvLink: 0,
      viewed: 0,
      createdAt: 0,
      updatedAt: 0
    })


    // loop through jobs, add to jobsWebsite if has website
    for (const element of tempJobs) {
      if (element.website.length>3) {
        allJobsWebsite.push(element)
      }
    }


    // updating the jobs if current user applied or not
    let checkedJobs = allJobsWebsite.map((main_job) => {
      for (const element of jobsUserApplied) {
        if (main_job.id === element.jobID) {
          main_job.currentUserApplied = true
        }
      }

      return main_job
    })

    // jobs present
    res.status(200).send(checkedJobs);

  } catch (error) {
    console.log(error)
    res.status(400).send("something went wrong");
  }
};


// handle getting of the nearby jobs=country of the user
export const handleGetNearbyJobs = async (req, res) => {

  try {

 // extract userId passed in the params
  const {
    userId
  } = req?.params || {}

  // extract the country of the user from the request body
  const {
    country
  } = req.body || {};

    const allJobs = await JobPostModel.find({
      "location.country": {
        $regex: country,
        $options: "i"
      },
    }).sort({
      createdAt: -1
    });

    // no jobs posted
    if (!allJobs) {
      throw new Error("currently there are no jobs");
    }


    // fetch in the applied jobs, those containing the userId
    // will help to match if a particular top job is applied.
    const jobsUserApplied = await JobsAppliedModel.find({
      "applicant.applicantID": userId
    }, {
      applicant: 0,
      cvLink: 0,
      viewed: 0,
      createdAt: 0,
      updatedAt: 0
    })

    // updating the jobs if current user applied or not
    let checkedJobs = allJobs.map((main_job) => {
      for (const element of jobsUserApplied) {
        if (main_job.id === element.jobID) {
          main_job.currentUserApplied = true
        }
      }

      return main_job
    })

    // jobs present
    res.status(200).send(checkedJobs);

  } catch (error) {
    console.log(error)
    res.status(400).send("something went wrong");
  }
};

// handle the searching of the job
export const handleGetAllJobsSearch = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}


  try {
    const {
      job_titles = [], 
      datePosted,
      country,
      entry, 
      category,
      access,
    } = req.body || {};


    let accessArray=[]
    accessArray.push(access)


    // Validate job_titles array
    if (!Array.isArray(job_titles)) {
      return res.status(400).send("job_titles should be an array");
    }

    // Initialize query
    const query = {
      $and: []
    };

    // handle job_titles search
    if (job_titles.length >= 0) {
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
          category: category
        });
    }

    // Handle datePosted filter
    if (datePosted) {
      const now = new Date();
      let startDate = null;
      let endDate = null;

      if (datePosted === "Today") {
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
      } else if (datePosted === "Yesterday") {
        startDate = new Date(now.setDate(now.getDate() - 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (datePosted === "Three Days") {
        startDate = new Date(now.setDate(now.getDate() - 2));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (datePosted === "One Week") {
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
      } else if (datePosted === "Two Weeks") {
        startDate = new Date(now.setDate(now.getDate() - 14));
        endDate = new Date();
      }

      if (startDate || endDate) {
        const dateQuery = {};
        if (startDate) dateQuery.$gte = startDate;
        if (endDate) dateQuery.$lt = endDate;

        query.$and.push({
          createdAt: dateQuery
        });
      }
    }

    //  country filter
    if (country) {
      query.$and.push({
        "location.country": {
          $regex: country,
          $options: "i"
        },
      });
    }

    // entry filter
    if (entry) {
      query.$and.push({
        "entry.level": {
          $regex: entry,
          $options: "i"
        }
      });
    }

    // access
    if (accessArray.length>=0) {
       query.$and.push({
        $or: [
          ...accessArray.map((term) => ({
            "jobtypeaccess.type": {
              $regex: term,
              $options: "i"
            },
          })),
          ...accessArray.map((term) => ({
            "jobtypeaccess.access": {
                $regex: term,
                $options: "i"
            },
          })),
        ],
      });

    }
    // Fetch jobs from the database latest first on the search results
    const searchResults = await JobPostModel.find(query).sort({
      createdAt: -1,
    });

    // fetch in the applied jobs, those containing the userId
    // will help to match if a particular top job is applied.
    const jobsUserApplied = await JobsAppliedModel.find({
      "applicant.applicantID": userId
    }, {
      applicant: 0,
      cvLink: 0,
      viewed: 0,
      createdAt: 0,
      updatedAt: 0
    })

    // updating the jobs if current user applied or not
    let checkedJobs = searchResults.map((main_job) => {
      for (const element of jobsUserApplied) {
        if (main_job.id === element.jobID) {
          main_job.currentUserApplied = true
        }
      }

      return main_job
    })


    // return matching jobs
    res.status(200).json({
      message: `Found ${checkedJobs.length} jobs`,
      data: checkedJobs,
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
};


// get specific post or one post
export const handleGetSpecificJobPost = async (req, res) => {
  try {
    const id = req?.params.id;
    const job = await JobPostModel.findById({
      _id: id
    });
    // job found
    res.status(200).send(job);
  } catch (error) {
    console.log(error)
    res.status(400).send("job not found");
  }
};


// handle uploading of the user cv
export const handleUploadingUserCV=async(req,res)=>{
  try {
    // get userId from params
    const userId = new mongoose.Types.ObjectId(req?.params.userId)

    // fetch user from the db
    const user=await personalModel.findById(userId,{password:0})

if (!user) {
      throw new Error("user does not exist!")
    }

    // get file 
    const file=req?.file

    // file,cv present
    if (file) {

      // check if user has previous file, delete it
      if (user.cvLink.length>2) {
        await SUPABASE.storage.from(SUPABASE_BUCKET).remove([user?.cvLink]);
      }
        

    const {originalname,buffer} = file;

    // cv file name with date preceding
    const finalDocumentUploadedName = `${Date.now()}-${originalname}`
    
    // Upload to Supabase folder jobs
    const {
      error
    } = await SUPABASE.storage
      .from(SUPABASE_BUCKET)
      .upload(finalDocumentUploadedName, buffer, {
        cacheControl: "5000",
        upsert: true,
        contentType: 'application/pdf'
      });

       // error encountered during file upload
      if (error) {
        throw new Error(error.message);
      }

      // update the user cv link in their profile
      user.cvLink=finalDocumentUploadedName

      // cv user updated, cv link
      await user.save()

    // update any previously made apps by the user to reflect latest cv
    const userApplications=await JobsAppliedModel.find({"applicant.applicantID":userId})

    // loop through user applications and update the cvName to reflect latest changes
    for (const element of userApplications) {
      element.cvName=finalDocumentUploadedName
      await element.save()
    }
  
    }else{
      throw new Error("please attach C.V!")
    }

    // send updated user with latest cv link to the frontend
    res.status(200).send(user)

  } catch (error) {
    // debug
   console.log(error);
  //  send error to the client
    res.status(400).send(`woops ${error.message}!`);
  }
}

// handle job application. cloud is supabase for CV and Cover letter
export const handleJobApplication = async (req, res) => {
  // the maximum no of applicants per job
  const MAX_APPLICANTS=500

  try {
    // extract the data from the body
    const dataBody = req?.body
    // file extract
    const file = req?.file;
    // will be used to update the main job respective values
    const jobID = new mongoose.Types.ObjectId(dataBody?.jobID);
    
    // gender extract
    const gender = dataBody?.applicant?.gender?.trim()?.toLowerCase();  

      // update the target job its respective applicants info.
      const jobTarget = await JobPostModel.findById(jobID);

      // reject the application process
      if (!jobTarget) {
        throw new Error("job does not exist");
      }

      // if max applicants reject
      if (
        jobTarget.applicants.total>jobTarget.applicants_max ||
        jobTarget.applicants.total>MAX_APPLICANTS
        ) {
        throw new Error('job no longer accepts applications, wait for the recruiter to update status!')
      }

      // update the details of applicants present in the job attribute
      let {
        total,
        male,
        female,
        other
      } = jobTarget.applicants;
      // add +1 for total
      jobTarget.applicants.total = total + 1;
      // update male, female and other counts
      if (gender === "male") {
        // male
        jobTarget.applicants.male = male + 1;
      } else if (gender === "female") {
        // female
        jobTarget.applicants.female = female + 1;
      } else {
        // other gender
        jobTarget.applicants.other = other + 1;
      }

      // save the target and updated job results
      await jobTarget.save();

      //save the application job request in the database
      await JobsAppliedModel.create(dataBody);

      res.status(200).send("application done!");
    
  } catch (error) {
    console.log(error);
    res.status(400).send(`woops ${error.message}!`);
  }
};