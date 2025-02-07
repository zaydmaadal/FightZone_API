const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Functie om huidige gebruiker op te halen
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Verwijder wachtwoord uit de response
    if (!user) return res.status(404).json({ msg: "Gebruiker niet gevonden" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ msg: "Serverfout" });
  }
};

// Functie om een gebruiker in te loggen
exports.loginUser = async (req, res) => {
  console.log("loginUser functie wordt geëxporteerd:", exports.loginUser);
  try {
    const { email, wachtwoord } = req.body;

    // Controleer of de gebruiker bestaat
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Gebruiker niet gevonden." });
    }

    // Controleer of het wachtwoord overeenkomt
    const isMatch = await bcrypt.compare(wachtwoord, user.wachtwoord);
    if (!isMatch) {
      return res.status(400).json({ message: "Ongeldige inloggegevens." });
    }

    // Maak een JWT token aan
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Stuur de token en gebruikersrol terug
    res.status(200).json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
