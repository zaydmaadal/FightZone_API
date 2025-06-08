const { initializeApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");

const firebaseConfig = {
  apiKey: "AIzaSyBQ6071ZiuxzavWN7FYmpXCm2WBCQNEq2s",
  authDomain: "fightzone-uploads.firebaseapp.com",
  projectId: "fightzone-uploads",
  storageBucket: "fightzone-uploads.firebasestorage.app",
  messagingSenderId: "874472940887",
  appId: "1:874472940887:web:8cb6fabde3210aeb490a12",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

module.exports = { storage };
