// server/routes/uploadRoutes.js
import express from 'express';
import { verifyToken } from './authRoutes.js';
import mongoose from 'mongoose';

const router = express.Router();

// saves storageData using userId from token
router.post('/upload-storage', verifyToken, async (req, res) => {
    const {savedImages = [] , globalTags = []} = req.body;

    try {
        const db = mongoose.connection.useDb('imgplus');
        const imgDB = db.collection('img_database');

        // ensure username is unique in collection
        await imgDB.createIndex({ username: 1 }, { unique: true });

        // match to ensure 1 document per user
        await imgDB.updateOne(
            { username: req.user.username }, // match by username
            { 
                $set:
                { 
                    savedImages, 
                    globalTags, 
                    username: req.user.username 
                } 
            },
            { upsert: true }
    );
        res.status(201).json({ message: 'Images and tags saved successfully' });

    } catch (error) {
        console.error('Error saving images and tags:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

    console.log("Uploading storage for:", req.user.username);
    console.log("Images count:", savedImages.length);
    console.log("Tags count:", globalTags.length);
});

router.post('/delete-image', verifyToken, async (req, res) => {
    const {imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({message: 'Image URL required'});
    }

    try {
        const db = mongoose.connection.useDb('imgplus');
        const imgDB = db.collection('img_database');

        const result = await imgDB.updateOne(
            {username: req.user.username },
            {$pull: {savedImages: {url: imageUrl } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({message: 'Image not found or not removed'});
        }

        res.status(200).json({ message: 'Image deleted.'});

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/delete-tag', verifyToken, async (req, res) => {
    const { tag } = req.body;

    if (!tag) {
        return res.status(400).json({message: 'Tag required'});
    }

    try {
        const db = mongoose.connection.useDb('imgplus');
        const imgDB = db.collection('img_database');

        // user accpunt
        const doc = await imgDB.findOne({ username: req.user.username });
        if (!doc) {
            return res.status(404).json({message: 'User not found'});
        }

        const updatedGlobalTags = doc.globalTags.filter(t => t.tag !== tag);
        const updatedImages = doc.savedImages.map(img => ({
            ...img,
            tags: img.tags.filter( t=> t !== tag)
        }));

        const result = await imgDB.updateOne(
            { username: req.user.username },
            {
                $set: { 
                    savedImages: updatedImages,
                    globalTags: updatedGlobalTags
                }
            }
    );

    if (result.modifiedCount === 0) {
        return res.status(404).json({message: 'Tag not found or not removed'});
    }

    res.status(200).json({ message: 'Tag deleted.'});

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// fetch user's saved storageData
router.get('/fetch-storage', verifyToken, async (req, res) => {
    try {
        const db = mongoose.connection.useDb('imgplus');
        const imgDB = db.collection('img_database');

        const doc = await imgDB.findOne({ username: req.user.username });

        if (!doc) {
            return res.status(404).json({ message: 'No data found' });
        }

    res.status(200).json({
        savedImages: doc.savedImages || [],
        globalTags: doc.globalTags || []
    });

} catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// export user's saved storageData for download
router.get('/export-storage', verifyToken, async (req, res) => {
    try {
        const db = mongoose.connection.useDb('imgplus');
        const imgDB = db.collection('img_database');

        const doc = await imgDB.findOne({ username: req.user.username });

        if (!doc) {
            return res.status(404).json({ message: 'No data found' });
        }

        // remove sensitive data
        const {savedImages, globalTags} = doc;

        res.status(200).json({savedImages, globalTags});
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;