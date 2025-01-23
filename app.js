var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const connectDB = require("./config/db");

//const submitRoutes = require("./routes/api/v1/submit");
const vechtersRoutes = require("./routes/api/v1/vechters");

require("dotenv").config();

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var app = express();

//app.use("/api/v1/submit", submitRoutes);
app.use("/api/v1/vechters", vechtersRoutes);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

connectDB();

console.log("API is running on http://localhost:3000");

module.exports = app;
