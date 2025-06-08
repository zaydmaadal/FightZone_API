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
const licenseRoutes = require("./routes/api/v1/licenses");
const eventsRoutes = require("./routes/api/v1/events");
const vkbmoSyncRoutes = require("./routes/api/v1/vkbmo-sync");
const matchesRoutes = require("./routes/api/v1/matches");
const importRoutes = require("./routes/api/v1/import");
const juryRoutes = require("./routes/api/v1/jury");
const uploadRoutes = require("./routes/api/v1/upload");

require("dotenv").config();

var indexRouter = require("./routes/index");
var app = express();

const allowedOrigins = ["http://localhost:3000", "https://app.fightzone.site"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Sta requests zonder origin toe (like mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "CORS-beleid staat toegang vanaf deze origin niet toe";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // Access-Control-Allow-Credentials
    exposedHeaders: ["Authorization"], // Belangrijk voor JWT tokens
  })
);

// Verhoog de limiet naar 10mb voor grote bestanden
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

app.use(logger("dev"));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);

app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/clubs", clubsRoutes);
app.use("/api/v1/licenses", licenseRoutes);
app.use("/api/v1/events", eventsRoutes);
app.use("/api/v1/vkbmo-sync", vkbmoSyncRoutes);
app.use("/api/v1/matches", matchesRoutes);
app.use("/api/v1/import", importRoutes);
app.use("/api/v1/jury", juryRoutes);
app.use("/api/v1/upload", uploadRoutes);

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

connectDB();

console.log("API is running on http://localhost:3000");

//const PORT = process.env.PORT || 3000;
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
