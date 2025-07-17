import JobPostModel from "../model/JobPostModel.js";
import personalModel from "../model/personalModel.js";
import TechPostModel from "../model/TechPostModel.js";

// search for global results
export const handleGetGlobalSearchResults = async (req, res) => {
  try {
    const searchTerm = req?.params.search_term;

    // no search term
    if (!searchTerm) {
      return res.status(400).json({ message: "Search term is required" });
    }

    // search length less than 3
    if (searchTerm?.length < 2) {
      throw new Error("type two or more keywords!");
    }

    // Case-insensitive text search
    const regex = new RegExp(searchTerm, "i");

    //Query for  Searching Users
    const usersQuery = {
      $or: [
        // Match name
        { name: regex },
        // Match country
        { country: regex },
        // match county or state
        { county: regex },
        // education institute
        { eduInstitution: regex },
        // Match specialization
        { specialisationTitle: regex },
        // Match in skills array
        { selectedSkills: { $in: [regex] } },
      ],
    };

    // Search Jobs
    const jobsQuery = {
      $or: [
        // match job title
        { title: regex },
        // match skills in job title
        { skills: { $in: [regex] } },
      ],
    };

    // Search Posts
    const postsQuery = {
      $or: [{ post_title: regex }, { description: regex }],
    };

    // Run all queries in parallel
    const [users, jobs, posts] = await Promise.all([
      personalModel.find(usersQuery),
      JobPostModel.find(jobsQuery),
      TechPostModel.find(postsQuery),
    ]);

    // Format response
    const response = {
      users: { count: users.length, data: users },
      jobs: { count: jobs.length, data: jobs },
      posts: { count: posts.length, data: posts },
    };

    // send response to the frontend
    res.status(200).send(response);
  } catch (error) {
    // debug
    console.error("Search error:", error);
    // send the error to the frontend
    res.status(400).send(error.message);
  }
};
