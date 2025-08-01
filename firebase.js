// firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./familyguide-36419-firebase-adminsdk-fbsvc-3b861cb53f');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
module.exports = db;
