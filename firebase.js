// firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./familyguide-36419-firebase-adminsdk-fbsvc-1469914e1d.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
module.exports = db;
