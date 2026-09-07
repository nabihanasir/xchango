"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOnlineClasses = void 0;
const JITSI_BASE_URL = process.env.JITSI_BASE_URL || 'https://meet.jit.si';
const ROOM_PREFIX = process.env.VIDEO_ROOM_PREFIX || 'xchango-classroom';
const classSchedule = [
    {
        id: 'fm-401',
        course: 'Formal Methods',
        instructor: 'Dr. Ayesha Malik',
        day: 'Today',
        time: '10:00 AM',
        duration: '60 min',
        status: 'Live now',
    },
    {
        id: 'se-302',
        course: 'Software Engineering',
        instructor: 'Mr. Hamza Tariq',
        day: 'Wednesday',
        time: '02:30 PM',
        duration: '75 min',
        status: 'Upcoming',
    },
    {
        id: 'db-211',
        course: 'Database Systems',
        instructor: 'Ms. Sara Khan',
        day: 'Friday',
        time: '11:00 AM',
        duration: '60 min',
        status: 'Recorded',
    },
];
const buildRoomName = (classId) => `${ROOM_PREFIX}-${classId}`.replace(/[^a-zA-Z0-9-]/g, '-');
const buildJoinUrl = (roomName, displayName) => {
    const url = new URL(`${JITSI_BASE_URL.replace(/\/$/, '')}/${roomName}`);
    if (displayName) {
        url.searchParams.set('userInfo.displayName', displayName);
    }
    return url.toString();
};
const listOnlineClasses = (displayName) => classSchedule.map((classItem) => {
    const roomName = buildRoomName(classItem.id);
    return {
        ...classItem,
        provider: 'Jitsi Meet',
        roomName,
        joinUrl: buildJoinUrl(roomName, displayName),
    };
});
exports.listOnlineClasses = listOnlineClasses;
