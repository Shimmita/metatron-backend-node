import {
  createClient
} from "@supabase/supabase-js";
import sharp from "sharp";
import JobPostModel from "../model/JobPostModel.js";
import JobsAppliedModel from "../model/JobsAppliedModel.js";
import personalModel from "../model/personalModel.js";
import {
  uploadToCloudinary
} from "../utils/cloudinary.js";

// creating of new post
export const handleCreateJob = async (req, res) => {
  try {
    // extract the post object from the form data passed as body from frontend
    const data = JSON.parse(req?.body.job);

    //   check if user has file
    if (req?.file) {
      // Compress and convert the image to AVIF format
      const compressedImageBuffer = await sharp(req.file.buffer)
        .resize({
          width: 500
        }) // Resize to a max width of 500px
        .toFormat("webp", {
          quality: 80
        }) // Convert to AVIF with 80% quality
        .toBuffer();

      // Upload the compressed AVIF image to Cloudinary
      const result = await uploadToCloudinary(
        compressedImageBuffer,
        "metatron/jobs/posts"
      );

      // getting avatar url and ID from the result of cloudinary upload
      const logo = result.secure_url;
      const logoID = result.public_id;
      await JobPostModel.create({
        ...data,
        logo,
        logoID
      });
      res.status(200).send("post uploaded successfully");
    } else {
      // save the user they have no file especially uploaded logo
      await JobPostModel.create(data);
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

// get all jobs
export const handleGetAllJobs = async (req, res) => {

  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}


  try {
    // sort them the latest first
    const allJobs = await JobPostModel.find({})
      .sort({
        createdAt: -1
      })
      .limit(20);
    // no jobs posted
    if (allJobs.length < 1) {
      throw new Error(
        "currently there are no jobs."
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
    // debug
    console.log(error);

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


// get job stats of the user
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
          // user applied the hob
          main_job.currentUserApplied = true
          // their cv was viewed by the hiring team
          main_job.viewedCV = element.viewed
          // the link to cv
          main_job.cvLink = element.cvLink
          // date of application
          main_job.dateApplied = element.createdAt

          // return the job 
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




// handle getting of the recommended jobs
export const handleGetRecommended = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}

  // extract skills of the user from the body request
  const job_skills = req?.body

  try {

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

    // no recommended job found
    if (!searchResults) {
      throw new Error("No matching jobs found.")
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

// get top 3 jobs that are latest
export const handleGetTopJobs = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}

  try {
    // sort them the latest first, exclude phone and email attached
    const latestJobs = await JobPostModel.find({}, {
        my_phone: 0,
        my_email: 0
      })
      .sort({
        createdAt: -1
      })
      .limit(4);

    // no jobs posted
    if (!latestJobs) {
      throw new Error(
        "currently there are no selected jobs please check on this page later."
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
    });
    // no jobs posted
    if (allJobs.length < 1) {
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

// handle getting of the nearby jobs=country of the user
export const handleGetNearbyJobs = async (req, res) => {
  // extract userId passed in the params
  const {
    userId
  } = req?.params || {}

  // extract the country of the user from the request body
  const {
    country
  } = req.body;

  try {
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
      job_titles = [], datePosted, country, entry
    } = req.body;

    // Validate job_titles array
    if (!Array.isArray(job_titles)) {
      return res.status(400).send("job_titles should be an array");
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

    // Handle country filter
    if (country) {
      query.$and.push({
        "location.country": {
          $regex: country,
          $options: "i"
        },
      });
    }

    // Handle entry filter
    if (entry) {
      query.$and.push({
        "entry.level": {
          $regex: entry,
          $options: "i"
        }
      });
    }

    // Fetch jobs from the database latest first on the search results
    const searchResults = await JobPostModel.find(query).sort({
      createdAt: -1,
    });

    // no job found
    if (searchResults.length < 1) {
      return res.status(404).json("No matching jobs found.");
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
      message: `Found ${checkedJobs.length} ${
        checkedJobs.length > 1 ? "jobs" : "job"
      }.`,
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

// delete the job post
export const handleDeleteJobPost = async (req, res) => {
  // get the req params value id of the post to be deleted
  const id = req.params.id;
  console.log(id);
};

// handle job application. cloud is supabase for CV and Cover letter
export const handleJobApplication = async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // extract the post object from the form data passed as body from frontend
    const dataBody = JSON.parse(req?.body.jobItem);
    // file extract
    const file = req?.file;
    // will be used to update the main job respective values
    const jobID = dataBody?.jobID;
    // gender extract
    const gender = dataBody?.applicant?.gender?.trim()?.toLowerCase();

    //   check if user has file
    if (file) {
      const {
        file
      } = req;
      const {
        originalname,
        buffer
      } = file;

      // Upload to Supabase folder jobs
      const {
        data,
        error
      } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(`jobs/${Date.now()}-${originalname}`, buffer, {
          cacheControl: "5000",
          upsert: false,
        });

      // error encountered during file upload
      if (error) {
        throw new Error(error.message);
      }
      // getting the public URl for saving
      // Extracting the public URL string for saving
      const {
        publicUrl
      } = supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .getPublicUrl(data.path).data;

      // update the target job its respective applicants info.
      const jobTarget = await JobPostModel.findById({
        _id: jobID
      });

      // reject the application process
      if (!jobTarget) {
        throw new Error("job does not exist");
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
      await JobsAppliedModel.create({
        ...dataBody,
        cvLink: publicUrl,
      });
      res.status(200).send("application successful");
    } else {
      //revoke job application, user must provide a cv
      throw new Error("please provide your cv");
    }
  } catch (error) {
    console.log(error);
    res.status(400).send(`woops ${error.message}!`);
  }
};