import AddEventModel from "../model/AddEventModel.js";
import GroupCommunityModel from "../model/GroupCommunityModel.js";
import JobPostModel from "../model/JobPostModel.js";
import personalModel from "../model/personalModel.js";
import PostCourseModel from "../model/PostCourseModel.js";
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
        { 'organisation.name': regex },
        { 'organisation.about': regex },
        { 'jobtypeaccess.type': regex },
        { 'jobtypeaccess.access': regex },
        { 'location.country': regex },
        { 'location.county': regex },
        { 'entry.level': regex },
        // match skills in job title
        { skills: { $in: [regex] } },
      ],
    };

    // Search Posts
    const postsQuery = {
      $or: [
        { post_title: regex }, 
        { post_body: regex }, 
        { description: regex },
        { 'post_category.main': regex },
        { 'post_location.country': regex },
        { 'post_location.state': regex },
        { 'post_owner.ownername': regex },
        { 'post_owner.ownertitle': regex },
      ],
    };

    // search events
       const eventsQuery = {
      $or: [
        { title: regex },
         { category: regex },
         { about: regex },
         // match skills in events
        { skills: { $in: [regex] } },
        // match topics in events
        { topics: { $in: [regex] } },
        ],
    };

    // search courses
         const coursesQuery = {
      $or: [
        { course_title: regex },
         { "course_category.main": regex },
         { "course_category.sub1": regex },
         { "course_category.sub2": regex },
         { "course_category.sub3": regex },
         { "course_category.sub4": regex },
         { "course_instructor.instructorName": regex },
         { "course_instructor.instructorTitle": regex },
         { course_description: regex },
        ],
    };

    // groups query
        const groupsQuery = {
      $or: [
        { name: regex },
        ],
    };


    // Run all queries in parallel
    const [users,jobs,posts,events,courses,groups] = await Promise.all([
      personalModel.find(usersQuery),
      JobPostModel.find(jobsQuery),
      TechPostModel.find(postsQuery),
      AddEventModel.find(eventsQuery),
      PostCourseModel.find(coursesQuery),
      GroupCommunityModel.find(groupsQuery,{name:1})
    ]);


    // Format response
    const response = {
      users: { count: users.length, data: users },
      jobs: { count: jobs.length, data: jobs },
      posts: { count: posts.length, data: posts },
      events:{count:events.length,data:events},
      courses:{count:courses.length,data:courses},
      groups:{count:groups.length,data:groups},
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
