import { Request, Response } from 'express';
import Document from '../models/Document';
import Application from '../models/Application';
import { sendResponse } from '../utils/response';

export const uploadDocument = async (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded', data: null });
  }

  const { applicationId, documentType } = req.body;
  if (!applicationId || !documentType) {
    return res.status(400).json({ success: false, message: 'applicationId and documentType are required', data: null });
  }

  const document = await Document.create({
    applicationId,
    documentType,
    fileUrl: req.file.path,
  });

  sendResponse(res, 201, 'Document uploaded successfully', document);
};

export const getMyDocuments = async (req: any, res: Response) => {
  const applications = await Application.find({ studentId: req.user._id }).select('_id');
  const documents = await Document.find({ applicationId: { $in: applications.map((application) => application._id) } });
  sendResponse(res, 200, 'Documents fetched successfully', documents);
};
