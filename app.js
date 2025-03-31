var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const connectDB = require("./config/db");

const usersRoutes = require("./routes/api/v1/users");
const authRoutes = require("./routes/api/v1/auth");
const clubsRoutes = require("./routes/api/v1/clubs");

require("dotenv").config();

var indexRouter = require("./routes/index");
var app = express();

app.use(
  cors({
    origin: "http://localhost:5173, http://localhost:3000, http://localhost:3001", // Specifieke frontend-URL
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);

app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/clubs", clubsRoutes);

connectDB();

console.log("API is running on http://localhost:3000");

//const PORT = process.env.PORT || 3000;
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
