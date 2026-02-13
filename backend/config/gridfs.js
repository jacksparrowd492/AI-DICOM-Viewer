const mongoose = require("mongoose");
const multer = require("multer");
const { GridFSBucket } = require("mongodb");

let gridFSBucket;

// Initialize GridFS after MongoDB connection
const initGridFS = () => {

    const db = mongoose.connection.db;

    gridFSBucket = new GridFSBucket(db, {
        bucketName: "uploads"
    });

    console.log("GridFSBucket initialized");
};

// Multer memory storage (MODERN way)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

module.exports = {
    upload,
    initGridFS,
    getGridFSBucket: () => gridFSBucket
};
