const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { upload, getGridFSBucket } = require('../config/gridfs');
const Study = require('../models/Study');

const router = express.Router();

router.use(auth);

// Upload DICOM files
router.post('/upload/:studyId', upload.array('files', 50), async (req, res) => {

    try {

        const bucket = getGridFSBucket();

        if (!bucket) {
            return res.status(500).json({ success:false, message:"GridFS not initialized"});
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success:false, message:'No files uploaded' });
        }

        const study = await Study.findById(req.params.studyId);

        if (!study) {
            return res.status(404).json({ success:false, message:'Study not found' });
        }

        const uploadedFiles = [];

        for (const file of req.files) {

            const uploadStream = bucket.openUploadStream(file.originalname, {
                contentType: file.mimetype
            });

            uploadStream.end(file.buffer);

            uploadedFiles.push({
                fileId: uploadStream.id,
                filename: file.originalname,
                contentType: file.mimetype,
                size: file.size,
                uploadDate: new Date(),
                metadata: { originalName: file.originalname }
            });
        }

        study.images.push(...uploadedFiles);
        study.status = 'completed';

        await study.save();

        res.json({
            success:true,
            message:`${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles,
            study
        });

    } catch(error) {

        console.error("Upload error:",error);

        res.status(500).json({
            success:false,
            message:'Error uploading files',
            error:error.message
        });

    }

});

// Download file
router.get('/download/:fileId', async (req,res)=>{

    try {

        const bucket = getGridFSBucket();

        const fileId = new mongoose.Types.ObjectId(req.params.fileId);

        res.set('Content-Type','application/octet-stream');

        const downloadStream = bucket.openDownloadStream(fileId);

        downloadStream.pipe(res);

    } catch(error){

        res.status(500).json({ success:false, message:error.message });

    }

});

module.exports = router;
