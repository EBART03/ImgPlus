// server/index.js
// node index.js

/*
database: imagepluscluster
    imgplus
        ├──img_database
            stores image information, such as images and tags
        ├──user_database
            stores login information
            stores information regarding processes, as to prevent:
                - synch requests
                - multiple requests for the same image
                - last export request 

    Start Command:
        node server/index.js

*/

console.log("Starting server..."); // debug

import express from 'express';
import mongoose, { model } from 'mongoose';
import { MongoClient } from 'mongodb';

import uploadRoutes from './routes/uploadRoutes.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api', uploadRoutes);


// const uri = "[mongodb link]"; // this was removed for security purposes for github upload
// you could recreate your own database in mongodb with this code instead and replace the uri

let authRoutes;
try {
    const module = await import('./routes/authRoutes.js');
    authRoutes = module.default;
} catch (err) {
    console.error("Error importing authRoutes:", err);
}

if (typeof authRoutes === 'function') {
    app.use('/api', authRoutes);
} else {
    console.warn("authRoutes not a valid Express router.");
}

startServer();

async function startServer() {
    try { 
        await mongoose.connect(uri, { dbName: 'imgplus' });
        console.log("Connected to Mongoose");

        const client = new MongoClient(uri);
        await client.connect();

        const db = client.db('imgplus');
        const imgDB = db.collection('img_database');

        // ensure unique index on username
        await imgDB.createIndex({ username: 1 }, { unique: true });


        const databasesList = await client.db().admin().listDatabases();
        console.log("Databases:");
        databasesList.databases.forEach(db => {
            console.log(` - ${db.name}`);
        });
        
        await client.close();    

        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
    }
}

