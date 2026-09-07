import { apiClient } from './httpClient';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type OnlineClassStatus = 'Live now' | 'Upcoming' | 'Ended' | 'Ready to start';

export interface OnlineClass {
  id: string;
  course: string;
  instructor: string;
  day: string;
  time: string;
  duration: string;
  status: OnlineClassStatus;
  provider: 'Jitsi Meet';
  roomName: string;
  joinUrl: string;
  hostUrl: string;
  canJoin: boolean;
  canStart: boolean;
  isHostSession: boolean;
  startedAt?: string;
  weekday: number;
  startMinutes: number;
  durationMinutes: number;
}

export interface OnlineClassesPayload {
  classes: OnlineClass[];
  provider: 'Jitsi Meet';
  roomPassword: string;
}

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await request;
  return response.data.data;
};

export const onlineClassesApi = {
  getClasses: () => unwrap<OnlineClassesPayload>(apiClient.get('/online-classes')),
  startClass: (classId: string) => unwrap<OnlineClass>(apiClient.post(`/online-classes/${classId}/start`)),
  endClass: (classId: string) => unwrap<OnlineClass>(apiClient.post(`/online-classes/${classId}/end`)),
};
