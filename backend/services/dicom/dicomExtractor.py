#!/usr/bin/env python3
import sys
import json
import pydicom
from datetime import datetime
import os

def extract_metadata(file_path):
    """Extract DICOM metadata from file"""
    try:
        # Read DICOM file
        ds = pydicom.dcmread(file_path, force=True)
        
        # Extract patient information
        patient_name = str(ds.get('PatientName', 'Unknown'))
        patient_id = str(ds.get('PatientID', 'Unknown'))
        patient_sex = str(ds.get('PatientSex', 'U'))
        patient_dob = str(ds.get('PatientBirthDate', ''))
        
        # Extract study information
        study_instance_uid = str(ds.StudyInstanceUID)
        study_date = str(ds.get('StudyDate', ''))
        study_time = str(ds.get('StudyTime', ''))
        study_description = str(ds.get('StudyDescription', ''))
        study_id = str(ds.get('StudyID', ''))
        accession_number = str(ds.get('AccessionNumber', ''))
        
        # Extract series information
        series_instance_uid = str(ds.SeriesInstanceUID)
        series_number = int(ds.get('SeriesNumber', 0))
        series_description = str(ds.get('SeriesDescription', ''))
        series_date = str(ds.get('SeriesDate', ''))
        series_time = str(ds.get('SeriesTime', ''))
        
        # Extract instance information
        sop_instance_uid = str(ds.SOPInstanceUID)
        sop_class_uid = str(ds.SOPClassUID)
        instance_number = int(ds.get('InstanceNumber', 0))
        
        # Extract modality and imaging parameters
        modality = str(ds.get('Modality', ''))
        body_part = str(ds.get('BodyPartExamined', ''))
        
        # Extract image parameters
        rows = int(ds.get('Rows', 0))
        columns = int(ds.get('Columns', 0))
        bits_allocated = int(ds.get('BitsAllocated', 0))
        bits_stored = int(ds.get('BitsStored', 0))
        
        # Extract spatial information
        slice_location = float(ds.get('SliceLocation', 0)) if 'SliceLocation' in ds else None
        slice_thickness = float(ds.get('SliceThickness', 0)) if 'SliceThickness' in ds else None
        
        pixel_spacing = None
        if 'PixelSpacing' in ds:
            pixel_spacing = [float(x) for x in ds.PixelSpacing]
        
        image_position = None
        if 'ImagePositionPatient' in ds:
            image_position = [float(x) for x in ds.ImagePositionPatient]
        
        image_orientation = None
        if 'ImageOrientationPatient' in ds:
            image_orientation = [float(x) for x in ds.ImageOrientationPatient]
        
        # Extract windowing information
        window_center = None
        window_width = None
        if 'WindowCenter' in ds:
            wc = ds.WindowCenter
            window_center = float(wc[0]) if isinstance(wc, (list, pydicom.multival.MultiValue)) else float(wc)
        if 'WindowWidth' in ds:
            ww = ds.WindowWidth
            window_width = float(ww[0]) if isinstance(ww, (list, pydicom.multival.MultiValue)) else float(ww)
        
        rescale_intercept = float(ds.get('RescaleIntercept', 0))
        rescale_slope = float(ds.get('RescaleSlope', 1))
        
        # Extract physician information
        referring_physician = str(ds.get('ReferringPhysicianName', ''))
        performing_physician = str(ds.get('PerformingPhysicianName', ''))
        
        # Extract institution information
        institution_name = str(ds.get('InstitutionName', ''))
        department_name = str(ds.get('InstitutionalDepartmentName', ''))
        
        # Extract equipment information
        manufacturer = str(ds.get('Manufacturer', ''))
        model_name = str(ds.get('ManufacturerModelName', ''))
        station_name = str(ds.get('StationName', ''))
        software_version = str(ds.get('SoftwareVersions', ''))
        
        # Build metadata dictionary
        metadata = {
            # Patient Information
            'patientName': patient_name,
            'patientId': patient_id,
            'gender': patient_sex,
            'dateOfBirth': patient_dob,
            
            # Study Information
            'studyInstanceUID': study_instance_uid,
            'studyDate': study_date,
            'studyTime': study_time,
            'studyDescription': study_description,
            'studyId': study_id,
            'accessionNumber': accession_number,
            
            # Series Information
            'seriesInstanceUID': series_instance_uid,
            'seriesNumber': series_number,
            'seriesDescription': series_description,
            'seriesDate': series_date,
            'seriesTime': series_time,
            
            # Instance Information
            'sopInstanceUID': sop_instance_uid,
            'sopClassUID': sop_class_uid,
            'instanceNumber': instance_number,
            
            # Modality and Body Part
            'modality': modality,
            'bodyPartExamined': body_part,
            
            # Image Parameters
            'rows': rows,
            'columns': columns,
            'bitsAllocated': bits_allocated,
            'bitsStored': bits_stored,
            
            # Spatial Information
            'sliceLocation': slice_location,
            'sliceThickness': slice_thickness,
            'pixelSpacing': pixel_spacing,
            'imagePosition': image_position,
            'imageOrientation': image_orientation,
            
            # Windowing
            'windowCenter': window_center,
            'windowWidth': window_width,
            'rescaleIntercept': rescale_intercept,
            'rescaleSlope': rescale_slope,
            
            # Physicians
            'referringPhysician': referring_physician,
            'performingPhysician': performing_physician,
            
            # Institution
            'institutionName': institution_name,
            'departmentName': department_name,
            
            # Equipment
            'manufacturer': manufacturer,
            'manufacturerModelName': model_name,
            'stationName': station_name,
            'softwareVersion': software_version,
            
            # File Information
            'fileSize': os.path.getsize(file_path)
        }
        
        # Output as JSON
        print(json.dumps(metadata, indent=2))
        return 0
        
    except Exception as e:
        error_data = {
            'error': str(e),
            'file_path': file_path
        }
        print(json.dumps(error_data), file=sys.stderr)
        return 1

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No file path provided'}), file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(json.dumps({'error': 'File not found'}), file=sys.stderr)
        sys.exit(1)
    
    exit_code = extract_metadata(file_path)
    sys.exit(exit_code)