/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { DoctorWeeklySchedule } from '../types';

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  let isPM = false;
  let cleanStr = timeStr.trim().toUpperCase();
  if (cleanStr.endsWith('PM')) {
    isPM = true;
    cleanStr = cleanStr.substring(0, cleanStr.length - 2).trim();
  } else if (cleanStr.endsWith('AM')) {
    cleanStr = cleanStr.substring(0, cleanStr.length - 2).trim();
  }
  
  const parts = cleanStr.split(':');
  if (parts.length < 2) return 0;
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

export function formatMinutesToTime(minutes: number): string {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
  const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hoursStr}:${minsStr} ${ampm}`;
}

export function getGeneratedSlots(
  startTimeStr: string,
  endTimeStr: string,
  breakStartTimeStr?: string,
  breakEndTimeStr?: string,
  durationMinutes: number = 30
): string[] {
  const slots: string[] = [];
  const start = parseTimeToMinutes(startTimeStr);
  const end = parseTimeToMinutes(endTimeStr);
  const duration = durationMinutes || 30;
  
  const bStart = breakStartTimeStr ? parseTimeToMinutes(breakStartTimeStr) : 0;
  const bEnd = breakEndTimeStr ? parseTimeToMinutes(breakEndTimeStr) : 0;
  const hasBreak = !(!breakStartTimeStr || !breakEndTimeStr || bEnd <= bStart);

  let current = start;
  while (current + duration <= end) {
    const slotStart = current;
    const slotEnd = current + duration;

    const overlapsWithBreak = hasBreak && (Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd));

    if (!overlapsWithBreak) {
      slots.push(formatMinutesToTime(current));
    }
    current += duration;
  }
  return slots;
}

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export function getDayNameFromDate(dateStr: string): string {
  if (!dateStr) return '';
  // Avoid shift in timezones by appending local morning, then get day
  const d = new Date(dateStr + 'T00:00:00');
  return DAYS_OF_WEEK[d.getDay()];
}

export const DEFAULT_WEEKLY_SCHEDULE: DoctorWeeklySchedule = {
  Sunday: { isOff: true, startTime: '09:00 AM', endTime: '05:00 PM', breakStartTime: '12:00 PM', breakEndTime: '01:00 PM' },
  Monday: { isOff: false, startTime: '09:00 AM', endTime: '05:00 PM', breakStartTime: '12:00 PM', breakEndTime: '01:00 PM' },
  Tuesday: { isOff: false, startTime: '09:00 AM', endTime: '05:00 PM', breakStartTime: '12:00 PM', breakEndTime: '01:00 PM' },
  Wednesday: { isOff: false, startTime: '09:00 AM', endTime: '05:00 PM', breakStartTime: '12:00 PM', breakEndTime: '01:00 PM' },
  Thursday: { isOff: false, startTime: '09:00 AM', endTime: '05:00 PM', breakStartTime: '12:00 PM', breakEndTime: '01:00 PM' },
  Friday: { isOff: false, startTime: '09:00 AM', endTime: '05:00 PM', breakStartTime: '12:00 PM', breakEndTime: '01:00 PM' },
  Saturday: { isOff: true, startTime: '09:00 AM', endTime: '05:00 PM', breakStartTime: '12:00 PM', breakEndTime: '01:00 PM' },
};
