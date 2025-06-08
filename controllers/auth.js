const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

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

// Functie om een reset token te genereren en email te versturen
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Password reset requested for email:", email);

    // Controleer of de gebruiker bestaat
    const user = await User.findOne({ email });
    if (!user) {
      console.log("No user found with email:", email);
      return res.status(404).json({ message: "Geen account gevonden met dit email adres." });
    }

    // Genereer een reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // Token geldig voor 1 uur

    // Sla de reset token op in de database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    console.log("Reset token saved for user:", user._id);

    // Log de SMTP configuratie (zonder wachtwoord)
    console.log("SMTP Config:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      secure: false
    });

    // Configureer SendGrid transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SMTP_PASS
      }
    });

    // Stuur de reset email
    const resetUrl = `${process.env.FRONTEND_URL}/wachtwoord/reset/${resetToken}`;
    console.log("Sending reset email to:", user.email);
    console.log("Reset URL:", resetUrl);

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: "Wachtwoord Reset - FightZone",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Wachtwoord Reset Verzoek</h1>
            <p style="color: #666; line-height: 1.6;">Beste ${user.voornaam},</p>
            <p style="color: #666; line-height: 1.6;">Je hebt een verzoek ingediend om je wachtwoord te resetten voor je FightZone account.</p>
            <p style="color: #666; line-height: 1.6;">Klik op de onderstaande knop om je wachtwoord te resetten:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Wachtwoord</a>
            </div>
            <p style="color: #666; line-height: 1.6;">Of kopieer en plak deze link in je browser:</p>
            <p style="color: #666; line-height: 1.6; word-break: break-all;">${resetUrl}</p>
            <p style="color: #666; line-height: 1.6;">Deze link is geldig voor 1 uur.</p>
            <p style="color: #666; line-height: 1.6;">Als je geen wachtwoord reset hebt aangevraagd, kun je deze email negeren.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">Dit is een automatische email, reageer hier niet op.</p>
          </div>
        `,
      });
      console.log("Reset email sent successfully");
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    res.status(200).json({ message: "Er is een email verzonden met instructies om je wachtwoord te resetten." });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Er is een fout opgetreden bij het verwerken van je verzoek." });
  }
};

// Functie om het wachtwoord te resetten met de token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    console.log("Attempting to reset password with token:", token);

    // Zoek de gebruiker met de reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log("No user found with valid reset token");
      return res.status(400).json({ message: "Ongeldige of verlopen reset token." });
    }

    console.log("Found user for reset:", user._id);

    // Hash het nieuwe wachtwoord
    const salt = await bcrypt.genSalt(10);
    user.wachtwoord = await bcrypt.hash(newPassword, salt);

    // Verwijder de reset token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log("Password successfully reset for user:", user._id);

    res.status(200).json({ message: "Je wachtwoord is succesvol gewijzigd." });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Er is een fout opgetreden bij het resetten van je wachtwoord." });
  }
};
