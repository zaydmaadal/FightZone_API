const { storage } = require("../src/lib/firebase");
const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { v4: uuidv4 } = require("uuid");

// Upload een bestand naar Firebase Storage
const uploadFile = async (req, res) => {
  if (!req.body.file || !req.body.name) {
    return res.status(400).json({
      error: "Bestand en naam zijn verplicht",
    });
  }

  try {
    const { file, name } = req.body;

    // Base64 decoderen
    const buffer = Buffer.from(file.split(",")[1], "base64");
    const fileExtension = name.split(".").pop();
    const storageRef = ref(storage, `profiles/${uuidv4()}.${fileExtension}`);

    // Upload naar Firebase
    const snapshot = await uploadBytes(storageRef, buffer);
    const downloadURL = await getDownloadURL(snapshot.ref);

    res.status(200).json({
      message: "Bestand succesvol geüpload",
      url: downloadURL,
    });
  } catch (error) {
    console.error("Upload fout:", error);
    res.status(500).json({
      error: "Upload mislukt",
      details: error.message,
    });
  }
};

module.exports = { uploadFile };
