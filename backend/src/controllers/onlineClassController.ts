import { Response } from 'express';
import { UserRole } from '../models/User';
import { assertJourneyStepDone } from '../services/journeyGateService';
import * as onlineClassService from '../services/onlineClassService';
import { sendResponse } from '../utils/response';

export const getOnlineClasses = async (req: any, res: Response) => {
  // Students attend these while abroad, so they open once the advisor has recorded their arrival. The join
  // links are only sent after that, not just hidden on the page.
  if (req.user?.role === UserRole.STUDENT) {
    await assertJourneyStepDone(req.user._id.toString(), 'arrival');
  }

  const classes = onlineClassService.listOnlineClasses(req.user?.name);
  sendResponse(res, 200, 'Online classes fetched successfully', {
    classes,
    provider: 'Jitsi Meet',
    roomPassword: onlineClassService.getRoomPasswordHint(),
  });
};

export const startOnlineClass = async (req: any, res: Response) => {
  try {
    const classItem = onlineClassService.startOnlineClass(req.params.id, req.user?.name || 'Host');
    sendResponse(res, 200, 'Class started successfully', classItem);
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    sendResponse(res, statusCode, error?.message || 'Unable to start class');
  }
};

export const endOnlineClass = async (req: any, res: Response) => {
  try {
    const classItem = onlineClassService.endOnlineClass(req.params.id, req.user?.name);
    sendResponse(res, 200, 'Class ended successfully', classItem);
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    sendResponse(res, statusCode, error?.message || 'Unable to end class');
  }
};
