const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class DicomService {
  /**
   * Extract metadata from DICOM file using Python script
   */
  static async extractMetadata(filePath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'dicomExtractor.py');
      
      const pythonProcess = spawn('python3', [pythonScript, filePath]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(stdout);
            resolve(metadata);
          } catch (error) {
            reject(new Error('Failed to parse metadata JSON'));
          }
        } else {
          reject(new Error(stderr || 'Failed to extract DICOM metadata'));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Python process error: ${error.message}`));
      });
    });
  }

  /**
   * Validate DICOM file
   */
  static async validateDicomFile(filePath) {
    try {
      // Check file exists
      await fs.access(filePath);
      
      // Check file size (max 100MB)
      const stats = await fs.stat(filePath);
      if (stats.size > 100 * 1024 * 1024) {
        throw new Error('File size exceeds 100MB limit');
      }
      
      // Try to extract metadata to validate it's a valid DICOM
      const metadata = await this.extractMetadata(filePath);
      
      return { valid: true, metadata };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate thumbnail from DICOM file
   */
  static async generateThumbnail(filePath, outputPath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'thumbnailGenerator.py');
      
      const pythonProcess = spawn('python3', [pythonScript, filePath, outputPath]);
      
      let stderr = '';
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(stderr || 'Failed to generate thumbnail'));
        }
      });
    });
  }
}

module.exports = DicomService;