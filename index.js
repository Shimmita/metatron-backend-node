// server/index.mjs

import bodyParser from "body-parser";
import {
  default as connectMongoStore
} from "connect-mongodb-session";
import cors from "cors";
import "dotenv/config";
import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import {
  handleAuthMiddleware
} from "./middlewares/auth_middleware.js";
import authenticationRouter from "./routes/authentication_route.js";
import manageCertVerifyRoute from "./routes/manage_cert_verify_route.js";
import manageChatAiRoute from "./routes/manage_chat_route.js";
import manageConnectRequestRoute from "./routes/manage_connect_route.js";
import manageConversationsRoute from "./routes/manage_converse_route.js";
import {
  coursesManageRouter
} from "./routes/manage_courses_route.js";
import { eventsManageRouter } from "./routes/manage_events_route.js";
import manageGlobalSearchRoute from "./routes/manage_global_search_route.js";
import manageGroupCommunityRoute from "./routes/manage_group_route.js";
import managePlatformInsights from "./routes/manage_insights_route.js";
import {
  manageJobsRouter
} from "./routes/manage_jobs_route.js";
import manageNetworkRoute from "./routes/manage_network_route.js";
import manage_payment_route from "./routes/manage_payment_route.js";
import {
  postManageRouter
} from "./routes/manage_post_route.js";
import manage_premium_route from "./routes/manage_premium_route.js";
import manageUsersRoute from "./routes/manage_users_route.js";
const mongoDBSession = connectMongoStore(session);
const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(
  cors({
    origin: [process.env.CROSS_ORIGIN_ALLOWED],
    credentials: true,
  })
);

// port for server
const PORT = process.env.PORT || 5000;

// base route
const BASE_ROUTE = process.env.BASE_ROUTE;

// environment
const environment=process.env.ENVIRONMENT_MODE


// init mongoDB
mongoose
  .connect(environment==="SANDBOX" ? process.env.MONGO_CONNECTION_URI:
    process.env.MONGO_CONNECTION_URI_CLOUD)
  .then(() => console.log(`connected to mongo database ${environment==="SANDBOX" ? "LOCAL":"CLOUD"}`))
  .catch((err) => console.log("database connection Failed ", err));

// listening for requests
app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});

// Initialize mongoDB session for session storage
const store = new mongoDBSession({
  uri: environment==="SANDBOX" ? process.env.MONGO_CONNECTION_URI:
    process.env.MONGO_CONNECTION_URI_CLOUD,
  collection: process.env.SESSION_STORE_NAME,
});

// for reverse proxy sites
app.set("trust proxy", 1);

// session initialization and maxAge
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: process.env.SESSION_NAME,
    store,
    cookie: {
      maxAge: 60 * 60 * 2 * 1000,
      secure: environment==="SANDBOX" ? false : true,
      sameSite: environment==="SANDBOX" ? "lax" : "none",
    },
  })
);

//signup users
app.use(`${BASE_ROUTE}/signup`, authenticationRouter);

// signin users
app.use(`${BASE_ROUTE}/signin`, authenticationRouter);

// forgot password route
app.use(`${BASE_ROUTE}/account`, authenticationRouter);


// posts route
app.use(`${BASE_ROUTE}/posts`,  postManageRouter);

// connections route
app.use(
  `${BASE_ROUTE}/connections`,
  handleAuthMiddleware,
  manageConnectRequestRoute
);

//jobs route
app.use(`${BASE_ROUTE}/jobs`,  manageJobsRouter);

// events route
app.use(`${BASE_ROUTE}/events`,  eventsManageRouter);

// chat route
app.use(`${BASE_ROUTE}/chats`, handleAuthMiddleware, manageChatAiRoute);

// courses route
app.use(`${BASE_ROUTE}/courses`,  coursesManageRouter);

//users route
app.use(`${BASE_ROUTE}/users`, handleAuthMiddleware, manageUsersRoute);

// friends or networks routed
app.use(`${BASE_ROUTE}/network`,handleAuthMiddleware,  manageNetworkRoute);

// global search route
app.use(`${BASE_ROUTE}/global`,  manageGlobalSearchRoute);

// groups and communities route
app.use(`${BASE_ROUTE}/groups`,  manageGroupCommunityRoute);

// conversations
app.use(
  `${BASE_ROUTE}/conversations`,
  handleAuthMiddleware,
  manageConversationsRoute
);

// platform insights route
app.use(`${BASE_ROUTE}/insights`,  managePlatformInsights);

// premium route
app.use(`${BASE_ROUTE}/premium`, handleAuthMiddleware, manage_premium_route);

// payment route
app.use(`${BASE_ROUTE}/payment`, handleAuthMiddleware,  manage_payment_route);


// certificate verification route, doesn't require auth middleware
app.use(`${BASE_ROUTE}/certificate`, manageCertVerifyRoute);

// signOut user
app.use(`${BASE_ROUTE}/signout`, (req, res) => {
  try {
    // destroy the session
    req.session.destroy();
    // clear cookie if any
    res.clearCookie(process.env.SESSION_NAME);
    res.status(200).send("logged out successfully");
  } catch (error) {
    res.status(400).send(err.message);
  }
});

// for checking user valid when frontend reloaded. all routes use it
app.use(`${BASE_ROUTE}/valid`, (req, res) => {
  try {
    const isOnline = req.session?.isOnline;
    // session ended/expired or guest user
    if (!isOnline) {
      throw new Error("Hi, Welcome 🤗");
    }

    res.status(200).send({
      authorised: true
    });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// not found route
app.use("*", (req, res) => {
  res.status(404).send("resource not accessible!");
});