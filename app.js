var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const connectDB = require("./config/db");

const usersRoutes = require("./routes/api/v1/users");

require("dotenv").config();

var indexRouter = require("./routes/index");
var app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);

app.use("/api/v1/users", usersRoutes);

connectDB();

console.log("API is running on http://localhost:3000");

module.exports = app;
