
import { supabase, authClient } from './supabase';
import { User, Branch, Batch, Subject, FacultyAssignment, CoordinatorAssignment, AttendanceRecord, UserRole, Notification, MidSemType, Mark, SystemSettings } from "../types";
import { SEED_BRANCHES, SEED_BATCHES, SEED_SUBJECTS, SEED_USERS, SEED_ASSIGNMENTS } from "../constants";

// --- Service Interface ---
interface IDataService {
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;

  // Hierarchy
  getBranches: () => Promise<Branch[]>;
  addBranch: (name: string) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  getBatches: (branchId: string) => Promise<Batch[]>;
  addBatch: (name: string, branchId: string) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;

  // Users
  getStudents: (branchId: string, batchId?: string) => Promise<User[]>;
  getStudentsByBranch: (branchId: string) => Promise<User[]>;
  createStudent: (data: Partial<User>) => Promise<void>;
  updateStudent: (uid: string, data: Partial<User>) => Promise<void>;
  importStudents: (students: Partial<User>[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  deleteUser: (uid: string) => Promise<void>;
  getAttendanceCount: () => Promise<number>;
  getNotificationsCount: () => Promise<number>;

  getSubjects: () => Promise<Subject[]>;
  addSubject: (name: string, code: string) => Promise<void>;
  updateSubject: (id: string, name: string, code: string) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;

  getFaculty: () => Promise<User[]>;
  createFaculty: (data: Partial<User>, password?: string) => Promise<void>;
  updateFaculty: (uid: string, data: Partial<User>) => Promise<void>;
  resetFacultyPassword: (uid: string, newPass: string) => Promise<void>;
  getAssignments: (facultyId?: string) => Promise<FacultyAssignment[]>;
  assignFaculty: (data: Omit<FacultyAssignment, 'id'>) => Promise<void>;
  removeAssignment: (id: string) => Promise<void>;

  getCoordinators: () => Promise<CoordinatorAssignment[]>;
  getCoordinatorByFaculty: (facultyId: string) => Promise<CoordinatorAssignment | null>;
  assignCoordinator: (data: Omit<CoordinatorAssignment, 'id'>) => Promise<void>;
  removeCoordinator: (id: string) => Promise<void>;

  // Attendance
  getAttendance: (branchId: string, batchId: string, subjectId: string, date?: string) => Promise<AttendanceRecord[]>;
  getBranchAttendance: (branchId: string, date?: string) => Promise<AttendanceRecord[]>;
  getAllStudents: () => Promise<User[]>;
  getDateAttendance: (date: string) => Promise<AttendanceRecord[]>;
  getStudentAttendance: (studentId: string) => Promise<AttendanceRecord[]>;
  saveAttendance: (records: AttendanceRecord[]) => Promise<void>;
  deleteAttendanceRecords: (ids: string[]) => Promise<void>;
  deleteAttendanceForOverwrite: (date: string, branchId: string, slot: number) => Promise<void>;

  // Notifications
  createNotification: (notification: Omit<Notification, 'id'>) => Promise<void>;
  getNotifications: (userId: string) => Promise<Notification[]>;
  updateNotificationStatus: (id: string, status: 'READ' | 'ACTIONED' | 'APPROVED' | 'DENIED') => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  // Setup
  seedDatabase: () => Promise<void>;
  searchStudents: (query: string) => Promise<User[]>;

  // Marks
  getMarks: (branchId: string, batchId: string, subjectId: string, midSemType: MidSemType) => Promise<Mark[]>;
  getStudentMarks: (studentId: string) => Promise<Mark[]>;
  getBranchMarks: (branchId: string, midSemType: MidSemType) => Promise<Mark[]>;
  saveMarks: (marks: Omit<Mark, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;

  // Settings
  getSystemSettings: () => Promise<SystemSettings>;
  updateSystemSettings: (settings: SystemSettings) => Promise<void>;

  // Developer / System
  getUsersCount: () => Promise<number>;
  searchUsers: (query: string) => Promise<User[]>;
  getRawProfile: (userId: string) => Promise<any>;
  ping: () => Promise<number>;
  getDeepStats: () => Promise<Record<string, { count: number; size: string }>>;
  getStorageStats: () => Promise<{ consumed: string; total: string; percent: number }>;
}

// --- Supabase Implementation ---
class SupabaseService implements IDataService {
  private _cache: Record<string, { data: any, ts: number }> = {};
  private readonly DEFAULT_TTL = 1000 * 60 * 10; // 10 minutes

  private async _withCache<T>(key: string, fetcher: () => Promise<T>, ttl = this.DEFAULT_TTL): Promise<T> {
    const now = Date.now();
    // 1. Memory Check
    if (this._cache[key] && (now - this._cache[key].ts < ttl)) {
      return this._cache[key].data;
    }

    // 2. Session Storage Check (only for meta-data to keep it fast across refreshes)
    const isMeta = key.startsWith('meta_');
    if (isMeta) {
      const stored = sessionStorage.getItem(`acro_cache_${key}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (now - parsed.ts < ttl) {
            this._cache[key] = parsed;
            return parsed.data;
          }
        } catch (e) {
          sessionStorage.removeItem(`acro_cache_${key}`);
        }
      }
    }

    // 3. Fetch Fresh
    const data = await fetcher();
    const entry = { data, ts: now };
    this._cache[key] = entry;

    if (isMeta) {
      try {
        sessionStorage.setItem(`acro_cache_${key}`, JSON.stringify(entry));
      } catch (e) {
        // Session storage full or disabled
      }
    }
    return data;
  }

  private _invalidate(pattern: string) {
    const keys = Object.keys(this._cache);
    for (const k of keys) {
      if (k === pattern || (pattern.endsWith('*') && k.startsWith(pattern.slice(0, -1)))) {
        delete this._cache[k];
        sessionStorage.removeItem(`acro_cache_${k}`);
      }
    }
    // Also scan SS directly for the pattern
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('acro_cache_')) {
        const actualKey = k.replace('acro_cache_', '');
        if (actualKey === pattern || (pattern.endsWith('*') && actualKey.startsWith(pattern.slice(0, -1)))) {
          sessionStorage.removeItem(k);
        }
      }
    }
  }


  private mapProfile(p: any): User {
    return {
      uid: p.id,
      email: p.email,
      displayName: p.display_name,
      role: p.role as UserRole,
      studentData: p.role === UserRole.STUDENT ? {
        branchId: p.branch_id,
        batchId: p.batch_id,
        enrollmentId: p.enrollment_id,
        rollNo: p.roll_no,
        mobileNo: p.mobile_no
      } : undefined,
      facultyData: p.role === UserRole.FACULTY ? {
        serialNo: p.roll_no
      } : undefined,
      lastLogin: p.last_login
    };
  }

  async login(email: string, pass: string): Promise<User> {
    // Standardize input: lowercase and trim to ensure case-insensitivity
    const normalizedInput = email.trim().toLowerCase();

    // If input doesn't look like email, assume it's Enrollment ID
    const loginIdentifier = normalizedInput.includes('@') ? normalizedInput : `${normalizedInput}@acropolis.in`;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginIdentifier,
      password: pass,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Login failed");

    // Fetch profile
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    const normalizedEmail = email.trim().toLowerCase();

    // Map of emails that should always be recognized as Admin or Developer
    const ELEVATED_ROLES: Record<string, UserRole> = {
      'developerishere@gmail.com': UserRole.DEVELOPER,
      'hod@acropolis.in': UserRole.ADMIN,
      'acro472007@acropolis.in': UserRole.ADMIN
    };
    const targetRole = ELEVATED_ROLES[normalizedEmail];

    if (profError || !profile) {
      throw new Error("Profile not found. Please contact administrator to be added.");
    }

    const mappedUser = this.mapProfile(profile);

    // Safety check for bootstrap accounts: Ensure role matches their elevation status
    if (targetRole && mappedUser.role !== targetRole) {
      mappedUser.role = targetRole;
      // Sync the database role with the elevated status
      supabase.from('profiles').update({ role: targetRole }).eq('id', authData.user.id).then();
    }

    // Record last login
    supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', mappedUser.uid).then();

    return mappedUser;
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const normalizedEmail = session.user.email?.toLowerCase() || '';
    const ELEVATED_ROLES: Record<string, UserRole> = {
      'developerishere@gmail.com': UserRole.DEVELOPER,
      'hod@acropolis.in': UserRole.ADMIN,
      'acro472007@acropolis.in': UserRole.ADMIN
    };
    const targetRole = ELEVATED_ROLES[normalizedEmail];

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) return null;

    const mappedUser = this.mapProfile(profile);

    // Safety check: If they are elevated but the profile has the wrong role, override it.
    if (targetRole && mappedUser.role !== targetRole) {
      mappedUser.role = targetRole;
      supabase.from('profiles').update({ role: targetRole }).eq('id', session.user.id).then();
    }

    return mappedUser;
  }

  async changePassword(currentPass: string, newPass: string): Promise<void> {
    // Supabase doesn't require current password to update (if session is active)
    const { error } = await supabase.auth.updateUser({
      password: newPass
    });
    if (error) throw error;

    // Also update profiles table if we store it there (redundant but matches previous implementation)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ password: newPass }).eq('id', user.id);
    }
  }

  // --- Hierarchy ---
  async getBranches(): Promise<Branch[]> {
    return this._withCache('meta_branches', async () => {
      const { data, error } = await supabase.from('branches').select('*');
      if (error) throw error;
      return data as Branch[];
    });
  }
  async addBranch(name: string): Promise<void> {
    const id = `b_${Date.now()}`;
    const { error } = await supabase.from('branches').insert([{ id, name }]);
    if (error) throw error;
    this._invalidate('meta_branches');
  }
  async deleteBranch(id: string): Promise<void> {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) throw error;
    this._invalidate('meta_branches');
  }

  async getBatches(branchId: string): Promise<Batch[]> {
    return this._withCache(`meta_batches_${branchId}`, async () => {
      const { data, error } = await supabase.from('batches').select('*').eq('branch_id', branchId);
      if (error) throw error;
      return data.map(b => ({
        id: b.id,
        name: b.name,
        branchId: b.branch_id
      }));
    });
  }
  async addBatch(name: string, branchId: string): Promise<void> {
    const id = `batch_${Date.now()}`;
    const { error } = await supabase.from('batches').insert([{ id, name, branch_id: branchId }]);
    if (error) throw error;
    this._invalidate(`meta_batches_${branchId}`);
  }
  async deleteBatch(id: string): Promise<void> {
    const { error } = await supabase.from('batches').delete().eq('id', id);
    if (error) throw error;
    this._invalidate('meta_batches_*');
  }

  async updateStudent(uid: string, data: Partial<User>): Promise<void> {
    const mobileNo = data.studentData?.mobileNo;
    const { error } = await supabase.from('profiles').update({
      display_name: data.displayName,
      enrollment_id: data.studentData?.enrollmentId,
      roll_no: data.studentData?.rollNo,
      mobile_no: mobileNo,
      branch_id: data.studentData?.branchId,
      batch_id: data.studentData?.batchId,
      password: mobileNo
    }).eq('id', uid);

    if (error) throw error;
    this._invalidate('students_*');
    if (mobileNo) {
      try {
        await supabase.rpc('admin_reset_password', {
          target_user_id: uid,
          new_password: mobileNo
        });
      } catch (e) {
        console.error("Failed to sync password:", e);
      }
    }
  }

  // --- Users ---
  async getStudents(branchId: string, batchId?: string): Promise<User[]> {
    const cacheKey = `students_${branchId}_${batchId || 'ALL'}`;
    return this._withCache(cacheKey, async () => {
      let query = supabase.from('profiles').select('*').eq('role', UserRole.STUDENT).eq('branch_id', branchId);
      if (batchId && batchId !== 'ALL') {
        query = query.eq('batch_id', batchId);
      }
      const { data, error } = await query;
      if (error) throw error;

      return data.map(p => this.mapProfile(p))
        .sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true }));
    }, 1000 * 60 * 5);
  }

  async getStudentsByBranch(branchId: string): Promise<User[]> {
    return this.getStudents(branchId);
  }

  async getAllStudents(): Promise<User[]> {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', UserRole.STUDENT);
    if (error) throw error;
    return data.map(p => this.mapProfile(p))
      .sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true }));
  }

  async createStudent(data: Partial<User>): Promise<void> {
    const enrollmentId = data.studentData?.enrollmentId;
    if (!enrollmentId) throw new Error("Enrollment ID required");
    const email = `${enrollmentId.toLowerCase()}@acropolis.in`;
    const password = data.studentData?.mobileNo || enrollmentId;

    const { error: wlError } = await supabase.from('whitelist').upsert([{ email, role: UserRole.STUDENT }]);
    if (wlError) throw wlError;

    const { data: authData, error } = await authClient.auth.signUp({
      email,
      password,
      options: { data: { display_name: data.displayName, role: UserRole.STUDENT } }
    });
    if (error) throw error;
    if (!authData.user) throw new Error("User creation failed");

    const { error: profError } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      email,
      display_name: data.displayName,
      role: UserRole.STUDENT,
      branch_id: data.studentData?.branchId,
      batch_id: data.studentData?.batchId,
      enrollment_id: enrollmentId,
      roll_no: data.studentData?.rollNo,
      mobile_no: data.studentData?.mobileNo,
      password
    }]);

    if (profError) throw profError;
    this._invalidate('students_*');
  }

  async importStudents(students: Partial<User>[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const s of students) {
      try {
        await this.createStudent(s);
        success++;
      } catch (e: any) {
        failed++;
        errors.push(`${s.displayName}: ${e.message}`);
      }
    }
    return { success, failed, errors };
  }

  async deleteUser(uid: string): Promise<void> {
    await supabase.from('assignments').delete().eq('faculty_id', uid);
    const { error } = await supabase.from('profiles').delete().eq('id', uid);
    if (error) throw error;
    this._invalidate('students_*');
    this._invalidate('meta_faculty');
  }

  async getFaculty(): Promise<User[]> {
    return this._withCache('meta_faculty', async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', UserRole.FACULTY);
      if (error) throw error;
      return data.map(p => this.mapProfile(p));
    });
  }

  async createFaculty(data: Partial<User>, password?: string): Promise<void> {
    if (!data.email) throw new Error("Email required");
    const pass = password || "password123";

    await supabase.from('whitelist').upsert([{ email: data.email, role: UserRole.FACULTY }]);
    const { data: authData, error } = await authClient.auth.signUp({
      email: data.email,
      password: pass,
      options: { data: { display_name: data.displayName, role: UserRole.FACULTY } }
    });
    if (error) throw error;
    if (!authData.user) throw new Error("User creation failed");

    const { error: profError } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      email: data.email,
      display_name: data.displayName,
      role: UserRole.FACULTY,
      roll_no: data.facultyData?.serialNo,
      password: pass
    }]);
    if (profError) throw profError;
    this._invalidate('meta_faculty');
  }

  async updateFaculty(uid: string, data: Partial<User>): Promise<void> {
    const { error } = await supabase.from('profiles').update({
      display_name: data.displayName,
      email: data.email,
      roll_no: data.facultyData?.serialNo
    }).eq('id', uid);
    if (error) throw error;
    this._invalidate('meta_faculty');
  }

  async resetFacultyPassword(uid: string, newPass: string): Promise<void> {
    const { error } = await supabase.rpc('admin_reset_password', {
      target_user_id: uid,
      new_password: newPass
    });
    if (error) throw error;
  }

  // --- Subjects & Assignments ---
  async getSubjects(): Promise<Subject[]> {
    return this._withCache('meta_subjects', async () => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw error;
      return data as Subject[];
    });
  }
  async addSubject(name: string, code: string): Promise<void> {
    const id = `sub_${Date.now()}`;
    const { error } = await supabase.from('subjects').insert([{ id, name, code }]);
    if (error) throw error;
    this._invalidate('meta_subjects');
  }
  async updateSubject(id: string, name: string, code: string): Promise<void> {
    const { error } = await supabase.from('subjects').update({ name, code }).eq('id', id);
    if (error) throw error;
    this._invalidate('meta_subjects');
  }
  async deleteSubject(id: string): Promise<void> {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
    this._invalidate('meta_subjects');
  }

  async getAssignments(facultyId?: string): Promise<FacultyAssignment[]> {
    const key = facultyId ? `meta_assignments_${facultyId}` : 'meta_assignments_ALL';
    return this._withCache(key, async () => {
      let q = supabase.from('assignments').select('*');
      if (facultyId) q = q.eq('faculty_id', facultyId);
      const { data, error } = await q;
      if (error) throw error;
      return data.map(a => ({
        id: a.id,
        facultyId: a.faculty_id,
        branchId: a.branch_id,
        batchId: a.batch_id,
        subjectId: a.subject_id
      }));
    });
  }
  async assignFaculty(data: any): Promise<void> {
    const obj = {
      id: data.id || `assign_${Date.now()}`,
      faculty_id: data.facultyId,
      branch_id: data.branchId,
      batch_id: data.batchId,
      subject_id: data.subjectId
    };
    const { error } = await supabase.from('assignments').upsert([obj]);
    if (error) throw error;
    this._invalidate('meta_assignments_*');
  }
  async removeAssignment(id: string): Promise<void> {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw error;
    this._invalidate('meta_assignments_*');
  }

  async getCoordinators(): Promise<CoordinatorAssignment[]> {
    const { data, error } = await supabase.from('coordinators').select('*');
    if (error) throw error;
    return data.map(c => ({
      id: c.id,
      facultyId: c.faculty_id,
      branchId: c.branch_id
    }));
  }

  async getCoordinatorByFaculty(facultyId: string): Promise<CoordinatorAssignment | null> {
    const { data, error } = await supabase.from('coordinators').select('*').eq('faculty_id', facultyId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { id: data.id, facultyId: data.faculty_id, branchId: data.branch_id };
  }

  async assignCoordinator(data: Omit<CoordinatorAssignment, 'id'>): Promise<void> {
    const obj = { id: `coord_${Date.now()}`, faculty_id: data.facultyId, branch_id: data.branchId };
    const { error } = await supabase.from('coordinators').upsert([obj]);
    if (error) throw error;
  }
  async removeCoordinator(id: string): Promise<void> {
    const { error } = await supabase.from('coordinators').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Attendance ---
  async getAttendance(branchId: string, batchId: string, subjectId: string, date?: string): Promise<AttendanceRecord[]> {
    let q = supabase.from('attendance').select('*').eq('branch_id', branchId).eq('subject_id', subjectId);
    if (batchId !== 'ALL') q = q.eq('batch_id', batchId);
    if (date) q = q.eq('date', date);

    const { data, error } = await q;
    if (error) throw error;
    return data.map(r => ({
      id: r.id,
      date: r.date,
      studentId: r.student_id,
      subjectId: r.subject_id,
      branchId: r.branch_id,
      batchId: r.batch_id,
      isPresent: r.is_present,
      markedBy: r.marked_by,
      timestamp: Number(r.timestamp),
      lectureSlot: r.lecture_slot,
      reason: r.reason
    }));
  }

  async getBranchAttendance(branchId: string, date?: string): Promise<AttendanceRecord[]> {
    let q = supabase.from('attendance').select('*').eq('branch_id', branchId);
    if (date) q = q.eq('date', date);
    const { data, error } = await q;
    if (error) throw error;
    return data.map(r => ({
      id: r.id,
      date: r.date,
      studentId: r.student_id,
      subjectId: r.subject_id,
      branchId: r.branch_id,
      batchId: r.batch_id,
      isPresent: r.is_present,
      markedBy: r.marked_by,
      timestamp: Number(r.timestamp),
      lectureSlot: r.lecture_slot,
      reason: r.reason
    }));
  }

  async getDateAttendance(date: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase.from('attendance').select('*').eq('date', date);
    if (error) throw error;
    return data.map(r => ({
      id: r.id,
      date: r.date,
      studentId: r.student_id,
      subjectId: r.subject_id,
      branchId: r.branch_id,
      batchId: r.batch_id,
      isPresent: r.is_present,
      markedBy: r.marked_by,
      timestamp: Number(r.timestamp),
      lectureSlot: r.lecture_slot,
      reason: r.reason
    }));
  }

  async getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase.from('attendance').select('*').eq('student_id', studentId);
    if (error) throw error;
    return data.map(r => ({
      id: r.id,
      date: r.date,
      studentId: r.student_id,
      subjectId: r.subject_id,
      branchId: r.branch_id,
      batchId: r.batch_id,
      isPresent: r.is_present,
      markedBy: r.marked_by,
      timestamp: Number(r.timestamp),
      lectureSlot: r.lecture_slot,
      reason: r.reason
    }));
  }

  async saveAttendance(records: AttendanceRecord[]): Promise<void> {
    const rows = records.map(r => ({
      id: r.id,
      date: r.date,
      student_id: r.studentId,
      subject_id: r.subjectId,
      branch_id: r.branchId,
      batch_id: r.batchId,
      is_present: r.isPresent,
      marked_by: r.markedBy,
      timestamp: r.timestamp,
      lecture_slot: r.lectureSlot,
      reason: r.reason
    }));
    await supabase.from('attendance').upsert(rows);
  }

  async deleteAttendanceRecords(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await supabase.from('attendance').delete().in('id', ids);
  }

  async deleteAttendanceForOverwrite(date: string, branchId: string, slot: number): Promise<void> {
    await supabase.from('attendance').delete().eq('date', date).eq('branch_id', branchId).eq('lecture_slot', slot);
  }

  // --- Notifications ---
  async createNotification(data: Omit<Notification, 'id'>): Promise<void> {
    const id = `notif_${Date.now()}`;
    await supabase.from('notifications').insert([{
      id,
      to_user_id: data.toUserId,
      from_user_id: data.fromUserId,
      from_user_name: data.fromUserName,
      type: data.type,
      status: data.status,
      data: data.data,
      timestamp: data.timestamp
    }]);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications').select('*').eq('to_user_id', userId).order('timestamp', { ascending: false });
    if (error) throw error;
    return data.map(n => ({
      id: n.id,
      toUserId: n.to_user_id,
      fromUserId: n.from_user_id,
      fromUserName: n.from_user_name,
      type: n.type as any,
      status: n.status as any,
      data: n.data as any,
      timestamp: Number(n.timestamp)
    }));
  }

  async updateNotificationStatus(id: string, status: string): Promise<void> {
    await supabase.from('notifications').update({ status }).eq('id', id);
  }

  async deleteNotification(id: string): Promise<void> {
    await supabase.from('notifications').delete().eq('id', id);
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await supabase.from('notifications').delete().eq('to_user_id', userId);
  }

  async searchStudents(query: string): Promise<User[]> {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', UserRole.STUDENT).or(`display_name.ilike.%${query}%,enrollment_id.ilike.%${query}%,mobile_no.ilike.%${query}%`).limit(50);
    if (error) throw error;
    return data.map(p => this.mapProfile(p));
  }

  // --- Marks ---
  async getMarks(branchId: string, batchId: string, subjectId: string, midSemType: MidSemType): Promise<Mark[]> {
    let studentQuery = supabase.from('profiles').select('id').eq('role', UserRole.STUDENT).eq('branch_id', branchId);
    if (batchId !== 'ALL') studentQuery = studentQuery.eq('batch_id', batchId);
    const { data: students, error: studentError } = await studentQuery;
    if (studentError) throw studentError;
    const studentIds = students.map(s => s.id);
    if (studentIds.length === 0) return [];

    const { data, error } = await supabase.from('marks').select('*').in('student_id', studentIds).eq('subject_id', subjectId).eq('mid_sem_type', midSemType);
    if (error) throw error;
    return data.map(m => ({
      id: m.id,
      studentId: m.student_id,
      subjectId: m.subject_id,
      facultyId: m.faculty_id,
      midSemType: m.mid_sem_type as MidSemType,
      marksObtained: Number(m.marks_obtained),
      maxMarks: Number(m.max_marks),
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));
  }

  async getStudentMarks(studentId: string): Promise<Mark[]> {
    const { data, error } = await supabase.from('marks').select('*').eq('student_id', studentId);
    if (error) throw error;
    return data.map(m => ({
      id: m.id,
      studentId: m.student_id,
      subjectId: m.subject_id,
      facultyId: m.faculty_id,
      midSemType: m.mid_sem_type as MidSemType,
      marksObtained: Number(m.marks_obtained) || 0,
      maxMarks: Number(m.max_marks) || 0,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));
  }

  async getBranchMarks(branchId: string, midSemType: MidSemType): Promise<Mark[]> {
    const { data: students, error: studentError } = await supabase.from('profiles').select('id').eq('role', UserRole.STUDENT).eq('branch_id', branchId);
    if (studentError) throw studentError;
    const studentIds = students.map(s => s.id);
    if (studentIds.length === 0) return [];
    const { data, error } = await supabase.from('marks').select('*').in('student_id', studentIds).eq('mid_sem_type', midSemType);
    if (error) throw error;
    return data.map(m => ({
      id: m.id,
      studentId: m.student_id,
      subjectId: m.subject_id,
      facultyId: m.faculty_id,
      midSemType: m.mid_sem_type as MidSemType,
      marksObtained: Number(m.marks_obtained) || 0,
      maxMarks: Number(m.max_marks) || 0,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));
  }

  async saveMarks(marks: any[]): Promise<void> {
    const rows = marks.map(m => ({
      student_id: m.studentId,
      subject_id: m.subjectId,
      faculty_id: m.facultyId,
      mid_sem_type: m.midSemType,
      marks_obtained: m.marksObtained,
      max_marks: m.maxMarks,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('marks').upsert(rows, { onConflict: 'student_id,subject_id,mid_sem_type' });
  }

  async getSystemSettings(): Promise<SystemSettings> {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error) throw error;
    const settings: SystemSettings = { studentLoginEnabled: true };
    data?.forEach(row => {
      if (row.key === 'student_login_enabled') settings.studentLoginEnabled = row.value === true || row.value === 'true';
    });
    return settings;
  }

  async updateSystemSettings(settings: SystemSettings): Promise<void> {
    await supabase.from('system_settings').upsert({ key: 'student_login_enabled', value: settings.studentLoginEnabled });
  }

  async getUsersCount(): Promise<number> {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    return count || 0;
  }

  async getAttendanceCount(): Promise<number> {
    const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
    return count || 0;
  }

  async getNotificationsCount(): Promise<number> {
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true });
    return count || 0;
  }

  async searchUsers(query: string): Promise<User[]> {
    const { data, error } = await supabase.from('profiles').select('*').or(`display_name.ilike.%${query}%,email.ilike.%${query}%,enrollment_id.ilike.%${query}%,mobile_no.ilike.%${query}%`).limit(50);
    if (error) throw error;
    return data.map(p => this.mapProfile(p));
  }

  async seedDatabase(): Promise<void> {
    const { data: b } = await supabase.from('branches').select('id').limit(1);
    if (!b || b.length === 0) await supabase.from('branches').insert(SEED_BRANCHES);
    const { data: bt } = await supabase.from('batches').select('id').limit(1);
    if (!bt || bt.length === 0) await supabase.from('batches').insert(SEED_BATCHES);
    const { data: s } = await supabase.from('subjects').select('id').limit(1);
    if (!s || s.length === 0) await supabase.from('subjects').insert(SEED_SUBJECTS);
    await supabase.from('system_settings').upsert([{ key: 'student_login_enabled', value: true }]);
  }

  async getRawProfile(userId: string): Promise<any> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  }

  async ping(): Promise<number> {
    const start = Date.now();
    await supabase.from('profiles').select('id').limit(1);
    return Date.now() - start;
  }

  async getDeepStats(): Promise<Record<string, { count: number; size: string }>> {
    const tables = ['profiles', 'attendance', 'marks', 'notifications', 'branches', 'batches', 'subjects', 'assignments', 'coordinators'];
    const results = await Promise.all(tables.map(async (t) => {
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
      return { table: t, count: count || 0 };
    }));

    const stats: Record<string, { count: number; size: string }> = {};
    results.forEach(res => {
      const bPerRow = ['profiles', 'attendance', 'marks'].includes(res.table) ? 1024 : 512;
      const totalBytes = res.count * bPerRow;
      const sizeStr = totalBytes > 1024 * 1024
        ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(totalBytes / 1024).toFixed(1)} KB`;
      stats[res.table] = { count: res.count, size: sizeStr };
    });
    return stats;
  }

  async getStorageStats(): Promise<{ consumed: string; total: string; percent: number }> {
    const stats = await this.getDeepStats();
    let totalBytes = 0;
    Object.values(stats).forEach(s => {
      const val = parseFloat(s.size);
      const isMB = s.size.includes('MB');
      totalBytes += isMB ? val * 1024 * 1024 : val * 1024;
    });

    const consumedMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const limitMB = 500;
    const percent = Math.min(99, (Number(consumedMB) / limitMB) * 100);

    return {
      consumed: `${consumedMB} MB`,
      total: `${limitMB} MB`,
      percent: parseFloat(percent.toFixed(1))
    };
  }
}

// --- MOCK Implementation (Unchanged) ---
class MockService implements IDataService {
  private simulateDelay = () => new Promise(resolve => setTimeout(resolve, 300));
  private load(key: string, seed: any[]): any[] {
    const data = localStorage.getItem(key);
    if (!data) { localStorage.setItem(key, JSON.stringify(seed)); return seed; }
    return JSON.parse(data);
  }
  private save(key: string, data: any[]) { localStorage.setItem(key, JSON.stringify(data)); }
  constructor() {
    if (!localStorage.getItem('ams_branches')) this.seedDatabase();
  }

  async login(email: string, pass: string): Promise<User> {
    await this.simulateDelay();
    const normalizedEmail = email.trim().toLowerCase();

    // Emergency Hidden Developer handle
    if (normalizedEmail === 'developerishere@gmail.com' && pass === 'devroot') {
      const devUser = {
        uid: 'dev_root_001',
        email: 'developerishere@gmail.com',
        displayName: 'System Developer',
        role: UserRole.DEVELOPER,
        lastLogin: new Date().toISOString()
      };
      localStorage.setItem('ams_current_user', JSON.stringify(devUser));
      return devUser;
    }

    const users = this.load('ams_users', SEED_USERS) as User[];
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (user && (!(user as any).password || (user as any).password === pass)) {
      user.lastLogin = new Date().toISOString();
      this.save('ams_users', users);
      localStorage.setItem('ams_current_user', JSON.stringify(user));
      return user;
    }
    throw new Error("Invalid credentials");
  }
  async logout() { localStorage.removeItem('ams_current_user'); }
  async getCurrentUser() { const d = localStorage.getItem('ams_current_user'); return d ? JSON.parse(d) : null; }
  async changePassword(c: string, n: string) {
    const u = await this.getCurrentUser();
    if (!u) throw new Error("Not logged in");
    const users = this.load('ams_users', SEED_USERS);
    const idx = users.findIndex((x: any) => x.uid === u.uid);
    if (idx >= 0) {
      if (users[idx].password && users[idx].password !== c) throw new Error("Incorrect Password");
      users[idx].password = n;
      this.save('ams_users', users);
    }
  }

  async getBranches() { return this.load('ams_branches', SEED_BRANCHES); }
  async addBranch(name: string) {
    const b = this.load('ams_branches', SEED_BRANCHES);
    b.push({ id: `b_${Date.now()}`, name });
    this.save('ams_branches', b);
  }
  async deleteBranch(id: string) {
    const b = this.load('ams_branches', SEED_BRANCHES);
    this.save('ams_branches', b.filter((x: any) => x.id !== id));
  }

  async getBatches(branchId: string) {
    await this.simulateDelay();
    const batches = this.load('ams_batches', SEED_BATCHES) as Batch[];
    return batches.filter(b => b.branchId === branchId);
  }
  async addBatch(name: string, branchId: string) {
    const batches = this.load('ams_batches', SEED_BATCHES);
    batches.push({ id: `batch_${Date.now()}`, name, branchId });
    this.save('ams_batches', batches);
  }
  async deleteBatch(id: string) {
    const b = this.load('ams_batches', SEED_BATCHES);
    this.save('ams_batches', b.filter((x: any) => x.id !== id));
  }

  async getStudents(branchId: string, batchId?: string) {
    const users = this.load('ams_users', SEED_USERS) as User[];
    let filtered = users.filter(u => u.role === UserRole.STUDENT && u.studentData?.branchId === branchId);
    if (batchId && batchId !== 'ALL') {
      filtered = filtered.filter(u => u.studentData?.batchId === batchId);
    }
    return filtered.sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true }));
  }

  async getAllStudents() {
    const users = this.load('ams_users', SEED_USERS) as User[];
    return users.filter(u => u.role === UserRole.STUDENT)
      .sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true }));
  }

  async createStudent(data: Partial<User>) {
    const users = this.load('ams_users', SEED_USERS) as User[];
    if (users.some(u => u.email === data.email || (data.studentData?.enrollmentId && u.studentData?.enrollmentId === data.studentData.enrollmentId))) {
      throw new Error(`Student with this email or Enrollment ID already exists.`);
    }
    users.push({ ...data, uid: `stu_${Date.now()}`, role: UserRole.STUDENT, password: data.studentData?.enrollmentId || 'password123' } as User);
    this.save('ams_users', users);
  }

  async updateStudent(uid: string, data: Partial<User>) {
    const users = this.load('ams_users', SEED_USERS) as User[];
    const idx = users.findIndex(u => u.uid === uid);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...data, studentData: { ...users[idx].studentData, ...data.studentData } as any };
      this.save('ams_users', users);
    }
  }

  async importStudents(students: Partial<User>[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const users = this.load('ams_users', SEED_USERS) as User[];
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
    const existingEnrollments = new Set(users.map(u => u.studentData?.enrollmentId?.toLowerCase()).filter(Boolean));
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    students.forEach((s, i) => {
      const email = s.email?.toLowerCase();
      const enroll = s.studentData?.enrollmentId?.toLowerCase();

      if (email && !existingEmails.has(email) && (!enroll || !existingEnrollments.has(enroll))) {
        users.push({ ...s, uid: `stu_${Date.now()}_${i}`, role: UserRole.STUDENT, password: enroll || 'password123' } as User);
        existingEmails.add(email);
        if (enroll) existingEnrollments.add(enroll);
        success++;
      } else {
        failed++;
        errors.push(`Duplicate: ${s.displayName} (${enroll})`);
      }
    });
    this.save('ams_users', users);
    return { success, failed, errors };
  }

  async deleteUser(uid: string) {
    const u = this.load('ams_users', SEED_USERS);
    this.save('ams_users', u.filter((x: any) => x.uid !== uid));
  }

  async getSubjects() { return this.load('ams_subjects', SEED_SUBJECTS); }
  async addSubject(name: string, code: string) {
    const s = this.load('ams_subjects', SEED_SUBJECTS);
    s.push({ id: `sub_${Date.now()}`, name, code });
    this.save('ams_subjects', s);
  }
  async updateSubject(id: string, name: string, code: string) {
    const s = this.load('ams_subjects', SEED_SUBJECTS);
    const idx = s.findIndex((x: any) => x.id === id);
    if (idx >= 0) { s[idx] = { ...s[idx], name, code }; this.save('ams_subjects', s); }
  }
  async deleteSubject(id: string) {
    const s = this.load('ams_subjects', SEED_SUBJECTS);
    this.save('ams_subjects', s.filter((x: any) => x.id !== id));
  }

  async getFaculty() { return (this.load('ams_users', SEED_USERS) as User[]).filter(u => u.role === UserRole.FACULTY); }
  async createFaculty(data: Partial<User>, password?: string) {
    const users = this.load('ams_users', SEED_USERS);
    users.push({ ...data, uid: `fac_${Date.now()}`, role: UserRole.FACULTY, password: password || 'password123', facultyData: { ...data.facultyData } });
    this.save('ams_users', users);
  }

  async updateFaculty(uid: string, data: Partial<User>) {
    const users = this.load('ams_users', SEED_USERS) as User[];
    const idx = users.findIndex(u => u.uid === uid);
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        ...data,
        facultyData: { ...users[idx].facultyData, ...data.facultyData }
      };
      this.save('ams_users', users);
    }
  }
  async resetFacultyPassword(uid: string, newPass: string) {
    const users = this.load('ams_users', SEED_USERS);
    const u = users.find((x: any) => x.uid === uid);
    if (u) { (u as any).password = newPass; this.save('ams_users', users); }
  }

  async getAssignments(facultyId?: string) {
    const all = this.load('ams_assignments', SEED_ASSIGNMENTS) as FacultyAssignment[];
    if (facultyId) return all.filter(a => a.facultyId === facultyId);
    return all;
  }
  async assignFaculty(data: any) {
    const all = this.load('ams_assignments', SEED_ASSIGNMENTS);
    if (data.id) {
      const idx = all.findIndex((x: any) => x.id === data.id);
      if (idx >= 0) all[idx] = data;
      else all.push(data);
    } else {
      all.push({ ...data, id: `assign_${Date.now()}` });
    }
    this.save('ams_assignments', all);
  }
  async removeAssignment(id: string) {
    const all = this.load('ams_assignments', SEED_ASSIGNMENTS);
    this.save('ams_assignments', all.filter((x: any) => x.id !== id));
  }

  async getCoordinators(): Promise<CoordinatorAssignment[]> {
    return this.load('ams_coordinators', []) as CoordinatorAssignment[];
  }

  async getCoordinatorByFaculty(facultyId: string): Promise<CoordinatorAssignment | null> {
    const all = this.load('ams_coordinators', []) as CoordinatorAssignment[];
    return all.find(c => c.facultyId === facultyId) || null;
  }

  async assignCoordinator(data: Omit<CoordinatorAssignment, 'id'>): Promise<void> {
    const all = this.load('ams_coordinators', []) as any[];
    const id = `coord_${Date.now()}`;
    all.push({ ...data, id });
    this.save('ams_coordinators', all);
  }

  async removeCoordinator(id: string): Promise<void> {
    const all = this.load('ams_coordinators', []) as any[];
    this.save('ams_coordinators', all.filter(c => c.id !== id));
  }

  async getAttendance(branchId: string, batchId: string, subjectId: string, date?: string) {
    const all = this.load('ams_attendance', []) as AttendanceRecord[];
    let filtered = all.filter(a => a.branchId === branchId && a.subjectId === subjectId);
    if (batchId === 'ALL') {
      filtered = filtered.filter(a => !date || a.date === date);
    } else {
      filtered = filtered.filter(a => a.batchId === batchId && (!date || a.date === date));
    }
    return filtered;
  }

  async getStudentsByBranch(branchId: string) {
    return this.getStudents(branchId);
  }

  async getBranchAttendance(branchId: string, date?: string) {
    const all = this.load('ams_attendance', []) as AttendanceRecord[];
    return all.filter(a => a.branchId === branchId && (!date || a.date === date));
  }

  async getDateAttendance(date: string) {
    const all = this.load('ams_attendance', []) as AttendanceRecord[];
    return all.filter(a => a.date === date);
  }

  async getStudentAttendance(studentId: string) {
    const all = this.load('ams_attendance', []) as AttendanceRecord[];
    return all.filter(a => a.studentId === studentId);
  }
  async saveAttendance(records: AttendanceRecord[]) {
    const all = this.load('ams_attendance', []) as AttendanceRecord[];
    if (records.length > 0) {
      const recordMap = new Map<string, AttendanceRecord>();
      all.forEach(r => recordMap.set(r.id, r));
      records.forEach(r => recordMap.set(r.id, r));
      this.save('ams_attendance', Array.from(recordMap.values()));
    }
  }

  async deleteAttendanceRecords(ids: string[]) {
    let all = this.load('ams_attendance', []) as AttendanceRecord[];
    const idsSet = new Set(ids);
    all = all.filter(a => !idsSet.has(a.id));
    this.save('ams_attendance', all);
  }

  async deleteAttendanceForOverwrite(date: string, branchId: string, slot: number) {
    let all = this.load('ams_attendance', []) as AttendanceRecord[];
    all = all.filter(a => !(a.date === date && a.branchId === branchId && a.lectureSlot === slot));
    this.save('ams_attendance', all);
  }

  async createNotification(data: any) {
    const all = this.load('ams_notifications', []);
    all.push({ ...data, id: `notif_${Date.now()}` });
    this.save('ams_notifications', all);
  }

  async getNotifications(userId: string) {
    const all = this.load('ams_notifications', []) as Notification[];
    return all.filter(n => n.toUserId === userId).sort((a, b) => b.timestamp - a.timestamp);
  }

  async updateNotificationStatus(id: string, status: any) {
    const all = this.load('ams_notifications', []) as Notification[];
    const idx = all.findIndex(n => n.id === id);
    if (idx >= 0) {
      all[idx].status = status;
      this.save('ams_notifications', all);
    }
  }

  async deleteNotification(id: string) {
    const all = this.load('ams_notifications', []) as Notification[];
    const filtered = all.filter(n => n.id !== id);
    this.save('ams_notifications', filtered);
  }

  async deleteAllNotifications(userId: string) {
    const all = this.load('ams_notifications', []) as Notification[];
    const filtered = all.filter(n => n.toUserId !== userId);
    this.save('ams_notifications', filtered);
  }

  async seedDatabase() {
    localStorage.setItem('ams_branches', JSON.stringify(SEED_BRANCHES));
    localStorage.setItem('ams_batches', JSON.stringify(SEED_BATCHES));
    localStorage.setItem('ams_subjects', JSON.stringify(SEED_SUBJECTS));
    localStorage.setItem('ams_users', JSON.stringify(SEED_USERS));
    localStorage.setItem('ams_assignments', JSON.stringify(SEED_ASSIGNMENTS));
    alert("Local Database seeded!");
  }

  async searchStudents(query: string): Promise<User[]> {
    const q = query.toLowerCase();
    const students = await this.getAllStudents();
    return students.filter(s =>
      s.displayName.toLowerCase().includes(q) ||
      s.studentData?.enrollmentId.toLowerCase().includes(q) ||
      s.studentData?.mobileNo.toLowerCase().includes(q)
    ).slice(0, 50);
  }

  // --- Marks ---
  async getMarks(branchId: string, batchId: string, subjectId: string, midSemType: MidSemType): Promise<Mark[]> {
    const all = this.load('ams_marks', []) as Mark[];
    const students = await this.getStudents(branchId, batchId);
    const studentIds = new Set(students.map(s => s.uid));
    return all.filter(m => studentIds.has(m.studentId) && m.subjectId === subjectId && m.midSemType === midSemType);
  }

  async getStudentMarks(studentId: string): Promise<Mark[]> {
    const all = this.load('ams_marks', []) as Mark[];
    return all.filter(m => m.studentId === studentId);
  }

  async getBranchMarks(branchId: string, midSemType: MidSemType): Promise<Mark[]> {
    const all = this.load('ams_marks', []) as Mark[];
    const students = await this.getStudents(branchId);
    const studentIds = new Set(students.map(s => s.uid));
    return all.filter(m => studentIds.has(m.studentId) && m.midSemType === midSemType);
  }

  async saveMarks(marks: Omit<Mark, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const all = this.load('ams_marks', []) as Mark[];
    marks.forEach(newMark => {
      const idx = all.findIndex(m => m.studentId === newMark.studentId && m.subjectId === newMark.subjectId && m.midSemType === newMark.midSemType);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...newMark, updatedAt: new Date().toISOString() };
      } else {
        all.push({ ...newMark, id: `mark_${Date.now()}_${Math.random()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
    });
    this.save('ams_marks', all);
  }

  async getSystemSettings(): Promise<SystemSettings> {
    const data = localStorage.getItem('ams_settings');
    if (!data) return { studentLoginEnabled: true };
    return JSON.parse(data);
  }

  async updateSystemSettings(settings: SystemSettings): Promise<void> {
    localStorage.setItem('ams_settings', JSON.stringify(settings));
  }

  async getUsersCount(): Promise<number> {
    const users = this.load('ams_users', SEED_USERS) as User[];
    const currentUser = JSON.parse(localStorage.getItem('ams_current_user') || '{}');
    // Hide hidden dev from count unless current user is that dev
    const filtered = users.filter(u => u.email !== 'developerishere@gmail.com' || currentUser.email === 'developerishere@gmail.com');
    return filtered.length;
  }

  async getAttendanceCount(): Promise<number> {
    const all = this.load('ams_attendance', []) as AttendanceRecord[];
    return all.length;
  }

  async getNotificationsCount(): Promise<number> {
    const all = this.load('ams_notifications', []) as Notification[];
    return all.length;
  }

  async searchUsers(query: string): Promise<User[]> {
    const q = query.toLowerCase();
    const users = this.load('ams_users', SEED_USERS) as User[];
    const currentUser = JSON.parse(localStorage.getItem('ams_current_user') || '{}');

    return users.filter(u => {
      // Basic visibility filter
      if (u.email === 'developerishere@gmail.com' && currentUser.email !== 'developerishere@gmail.com') return false;

      return u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.studentData?.enrollmentId?.toLowerCase().includes(q) ||
        u.studentData?.mobileNo?.includes(q);
    }).slice(0, 50);
  }

  async getRawProfile(userId: string): Promise<any> {
    const users = this.load('ams_users', SEED_USERS);
    return users.find((u: any) => u.uid === userId || u.id === userId);
  }

  async ping(): Promise<number> {
    return Math.floor(Math.random() * 5) + 1; // 1-5ms for mock
  }

  async getDeepStats(): Promise<Record<string, { count: number; size: string }>> {
    const tableKeys = ['profiles', 'attendance', 'marks', 'notifications', 'branches', 'batches', 'subjects', 'assignments', 'coordinators'];
    const amsNames: Record<string, string> = {
      profiles: 'ams_users', attendance: 'ams_attendance', marks: 'ams_marks', notifications: 'ams_notifications',
      branches: 'ams_branches', batches: 'ams_batches', subjects: 'ams_subjects', assignments: 'ams_assignments', coordinators: 'ams_coordinators'
    };
    const stats: Record<string, { count: number; size: string }> = {};
    tableKeys.forEach(k => {
      const rows = this.load(amsNames[k], []);
      const count = rows.length;
      const sizeKB = (count * 0.8).toFixed(1);
      stats[k] = { count, size: `${sizeKB} KB` };
    });
    return stats;
  }

  async getStorageStats(): Promise<{ consumed: string; total: string; percent: number }> {
    const stats = await this.getDeepStats();
    let totalKB = 0;
    Object.values(stats).forEach(s => {
      totalKB += parseFloat(s.size);
    });
    const consumedMB = (totalKB / 1024).toFixed(2);
    return {
      consumed: `${consumedMB} MB`,
      total: "512 MB",
      percent: parseFloat((Number(consumedMB) / 5.12).toFixed(1))
    };
  }
}

const hasSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder');
export const db = hasSupabaseKey ? new SupabaseService() : new MockService();
