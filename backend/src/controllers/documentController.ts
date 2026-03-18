import { Request, Response } from 'express';
import Document from '../models/Document';
import { sendResponse } from '../utils/response';

export const uploadDocument = async (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded', data: null });
  }

  const document = await Document.create({
    name: req.file.originalname,
    type: req.file.mimetype,
    url: req.file.path,
    owner: req.user._id,
  });

  sendResponse(res, 201, 'Document uploaded successfully', document);
};

export const getMyDocuments = async (req: any, res: Response) => {
  const documents = await Document.find({ owner: req.user._id });
  sendResponse(res, 200, 'Documents fetched successfully', documents);
};
