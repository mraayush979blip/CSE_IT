
export enum UserRole {
  ADMIN = 'ADMIN',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT'
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  studentData?: {
    branchId: string;
    batchId: string;
    enrollmentId: string;
    rollNo?: string;
    mobileNo?: string;
  };
  facultyData?: {
    serialNo?: string;
  };
}

export interface Branch {
  id: string;
  name: string;
}

export interface Batch {
  id: string;
  name: string;
  branchId: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

// Links a faculty member to a specific class context
export interface FacultyAssignment {
  id: string;
  facultyId: string;
  branchId: string;
  batchId: string; // 'ALL' or specific batchId
  subjectId: string;
}

export interface CoordinatorAssignment {
  id: string;
  facultyId: string;
  branchId: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  subjectId: string;
  branchId: string;
  batchId: string;
  isPresent: boolean;
  markedBy: string; // Faculty UID
  timestamp: number;
  lectureSlot?: number; // 1 to 7
  reason?: string;
}

export interface Notification {
  id: string;
  toUserId: string;
  fromUserId: string;
  fromUserName: string;
  type: 'OVERWRITE_REQUEST' | 'REQUEST_APPROVED' | 'REQUEST_DENIED';
  status: 'PENDING' | 'READ' | 'ACTIONED' | 'APPROVED' | 'DENIED';
  data: {
    date: string;
    slot: number;
    subjectName: string;
    branchId: string;
    reason?: string;
    payload?: AttendanceRecord[];
  };
  timestamp: number;
}

export type MidSemType = 'MID_SEM_1' | 'MID_SEM_2' | 'MID_SEM_REMEDIAL';

export interface Mark {
  id: string;
  studentId: string;
  subjectId: string;
  facultyId: string;
  midSemType: MidSemType;
  marksObtained: number;
  maxMarks: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemSettings {
  studentLoginEnabled: boolean;
}
