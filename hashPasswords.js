const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

// Verbind met de database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Functie om alle wachtwoorden te hashen
const hashAllPasswords = async () => {
  try {
    // Haal alle gebruikers op
    const users = await User.find();

    // Loop door elke gebruiker en hash het wachtwoord
    for (const user of users) {
      if (user.wachtwoord && !user.wachtwoord.startsWith("$2a$")) {
        // Hash het wachtwoord
        const hashedPassword = await bcrypt.hash(user.wachtwoord, 10);
        user.wachtwoord = hashedPassword;
        await user.save();
        console.log(`Wachtwoord gehasht voor gebruiker: ${user.email}`);
      }
    }

    console.log("Alle wachtwoorden zijn succesvol gehasht.");
    process.exit(0);
  } catch (error) {
    console.error("Fout bij het hashen van wachtwoorden:", error);
    process.exit(1);
  }
};

// Voer de functie uit
hashAllPasswords();
