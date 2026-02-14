
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
}

// --- Supabase Implementation ---
class SupabaseService implements IDataService {

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
      } : undefined
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
    const isBootstrapAdmin = normalizedEmail === 'hod@acropolis.in' || normalizedEmail === 'acro472007@acropolis.in';

    if (profError || !profile) {
      // Emergency fallback for bootstrap admin
      if (isBootstrapAdmin) {
        const adminData = {
          uid: authData.user.id,
          email: normalizedEmail,
          displayName: normalizedEmail === 'hod@acropolis.in' ? "Admin HOD" : "Admin",
          role: UserRole.ADMIN
        };

        // Auto-create profile record so RLS and other lookups work correctly
        try {
          await supabase.from('profiles').insert([{
            id: adminData.uid,
            email: adminData.email,
            display_name: adminData.displayName,
            role: 'ADMIN'
          }]);
        } catch (e) {
          console.error("Failed to auto-create admin profile", e);
        }

        return adminData;
      }
      throw new Error("Profile not found");
    }

    const mappedUser = this.mapProfile(profile);

    // Safety check for bootstrap admin
    if (isBootstrapAdmin && mappedUser.role !== UserRole.ADMIN) {
      mappedUser.role = UserRole.ADMIN;
      supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', authData.user.id).then();
    }

    return mappedUser;
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const normalizedEmail = session.user.email?.toLowerCase();
    const isBootstrapAdmin = normalizedEmail === 'hod@acropolis.in' || normalizedEmail === 'acro472007@acropolis.in';

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      if (isBootstrapAdmin) {
        const adminData = {
          uid: session.user.id,
          email: normalizedEmail!,
          displayName: normalizedEmail === 'hod@acropolis.in' ? "Admin HOD" : "Admin",
          role: UserRole.ADMIN
        };

        // Auto-create profile record if it's missing but they are a bootstrap admin
        try {
          await supabase.from('profiles').insert([{
            id: adminData.uid,
            email: adminData.email,
            display_name: adminData.displayName,
            role: 'ADMIN'
          }]);
        } catch (e) {
          // Ignore error if it already exists or fails due to RLS
        }

        return adminData;
      }
      return null;
    }

    const mappedUser = this.mapProfile(profile);

    // Safety check: If they are a bootstrap admin but the profile has the wrong role, override it.
    if (isBootstrapAdmin && mappedUser.role !== UserRole.ADMIN) {
      mappedUser.role = UserRole.ADMIN;
      // Optionally update the DB fix the record
      supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', session.user.id).then();
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
    const { data, error } = await supabase.from('branches').select('*');
    if (error) throw error;
    return data as Branch[];
  }
  async addBranch(name: string): Promise<void> {
    const id = `b_${Date.now()}`;
    const { error } = await supabase.from('branches').insert([{ id, name }]);
    if (error) throw error;
  }
  async deleteBranch(id: string): Promise<void> {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) throw error;
  }

  async getBatches(branchId: string): Promise<Batch[]> {
    const { data, error } = await supabase.from('batches').select('*').eq('branch_id', branchId);
    if (error) throw error;
    return data.map(b => ({
      id: b.id,
      name: b.name,
      branchId: b.branch_id
    }));
  }
  async addBatch(name: string, branchId: string): Promise<void> {
    const id = `batch_${Date.now()}`;
    const { error } = await supabase.from('batches').insert([{ id, name, branch_id: branchId }]);
    if (error) throw error;
  }
  async deleteBatch(id: string): Promise<void> {
    const { error } = await supabase.from('batches').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Users ---
  async getStudents(branchId: string, batchId?: string): Promise<User[]> {
    let query = supabase.from('profiles').select('*').eq('role', UserRole.STUDENT).eq('branch_id', branchId);
    if (batchId && batchId !== 'ALL') {
      query = query.eq('batch_id', batchId);
    }
    const { data, error } = await query;
    if (error) throw error;

    return data.map(p => this.mapProfile(p))
      .sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true }));
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
    if (!enrollmentId) throw new Error("Enrollment ID is required");

    // Auto-generate email from Enrollment ID if not provided
    const email = `${enrollmentId.toLowerCase()}@acropolis.in`;

    // Password set to Mobile No or Enrollment ID fallback
    const password = data.studentData?.mobileNo || enrollmentId;

    const { data: authData, error } = await authClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          display_name: data.displayName,
          role: UserRole.STUDENT
        }
      }
    });

    if (error) throw error;
    if (!authData.user) throw new Error("Could not create user");

    // Create profile
    const { error: profError } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      email: email,
      display_name: data.displayName,
      role: UserRole.STUDENT,
      branch_id: data.studentData?.branchId,
      batch_id: data.studentData?.batchId,
      enrollment_id: enrollmentId,
      roll_no: data.studentData?.rollNo,
      mobile_no: data.studentData?.mobileNo,
      password: password
    }]);

    if (profError) throw profError;
  }

  async updateStudent(uid: string, data: Partial<User>): Promise<void> {
    const mobileNo = data.studentData?.mobileNo;

    // Update profile data including the administrative password reference
    const { error } = await supabase.from('profiles').update({
      display_name: data.displayName,
      enrollment_id: data.studentData?.enrollmentId,
      roll_no: data.studentData?.rollNo,
      mobile_no: mobileNo,
      branch_id: data.studentData?.branchId,
      batch_id: data.studentData?.batchId,
      password: mobileNo // Keep reference password in sync with mobile no
    }).eq('id', uid);

    if (error) throw error;

    // Also update the actual login password in auth.users if mobile number is provided
    if (mobileNo) {
      try {
        await supabase.rpc('admin_reset_password', {
          target_user_id: uid,
          new_password: mobileNo
        });
      } catch (e) {
        console.error("Failed to sync auth password with mobile number:", e);
        // We don't throw here to avoid blocking the profile update, 
        // but the password will be out of sync if the RPC fails.
      }
    }
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
        const msg = e.message || "Unknown error";
        errors.push(`${s.displayName} (${s.studentData?.enrollmentId}): ${msg}`);
        console.error(`Import failed for ${s.displayName}`, e);
      }
    }
    return { success, failed, errors };
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      // Defensive cleanup: Manually clear references in case constraints are missing or restrictive
      await supabase.from('assignments').delete().eq('faculty_id', uid);
      await supabase.from('attendance').update({ marked_by: null }).eq('marked_by', uid);
      await supabase.from('notifications').update({ from_user_id: null }).eq('from_user_id', uid);
    } catch (e) {
      console.warn("Manual cleanup encountered an issue, proceeding to profile deletion", e);
    }

    const { error } = await supabase.from('profiles').delete().eq('id', uid);
    if (error) throw error;
  }

  async getFaculty(): Promise<User[]> {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', UserRole.FACULTY);
    if (error) throw error;
    return data.map(p => this.mapProfile(p));
  }

  async createFaculty(data: Partial<User>, password?: string): Promise<void> {
    if (!data.email) throw new Error("Email is required");
    const pass = password || "password123";

    const { data: authData, error } = await authClient.auth.signUp({
      email: data.email,
      password: pass,
      options: {
        data: {
          display_name: data.displayName,
          role: UserRole.FACULTY
        }
      }
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
  }

  async updateFaculty(uid: string, data: Partial<User>): Promise<void> {
    const { error } = await supabase.from('profiles').update({
      display_name: data.displayName,
      email: data.email,
      roll_no: data.facultyData?.serialNo
    }).eq('id', uid);
    if (error) throw error;
  }

  async resetFacultyPassword(uid: string, newPass: string): Promise<void> {
    // Calling the secure RPC function to update auth.users and profiles table
    const { error } = await supabase.rpc('admin_reset_password', {
      target_user_id: uid,
      new_password: newPass
    });

    if (error) throw error;
  }

  // --- Subjects & Assignments ---
  async getSubjects(): Promise<Subject[]> {
    const { data, error } = await supabase.from('subjects').select('*');
    if (error) throw error;
    return data as Subject[];
  }
  async addSubject(name: string, code: string): Promise<void> {
    const id = `sub_${Date.now()}`;
    const { error } = await supabase.from('subjects').insert([{ id, name, code }]);
    if (error) throw error;
  }
  async updateSubject(id: string, name: string, code: string): Promise<void> {
    const { error } = await supabase.from('subjects').update({ name, code }).eq('id', id);
    if (error) throw error;
  }
  async deleteSubject(id: string): Promise<void> {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
  }

  async getAssignments(facultyId?: string): Promise<FacultyAssignment[]> {
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
  }
  async removeAssignment(id: string): Promise<void> {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw error;
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
    const { data, error } = await supabase
      .from('coordinators')
      .select('*')
      .eq('faculty_id', facultyId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      facultyId: data.faculty_id,
      branchId: data.branch_id
    };
  }

  async assignCoordinator(data: Omit<CoordinatorAssignment, 'id'>): Promise<void> {
    const obj = {
      id: `coord_${Date.now()}`,
      faculty_id: data.facultyId,
      branch_id: data.branchId
    };
    const { error } = await supabase.from('coordinators').upsert([obj]);
    if (error) throw error;
  }

  async removeCoordinator(id: string): Promise<void> {
    const { error } = await supabase.from('coordinators').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Attendance ---
  async getAttendance(branchId: string, batchId: string, subjectId: string, date?: string): Promise<AttendanceRecord[]> {
    let q = supabase.from('attendance')
      .select('*')
      .eq('branch_id', branchId)
      .eq('subject_id', subjectId);

    if (batchId !== 'ALL') {
      q = q.eq('batch_id', batchId);
    }
    if (date) {
      q = q.eq('date', date);
    }

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
    let q = supabase.from('attendance')
      .select('*')
      .eq('branch_id', branchId);

    if (date) {
      q = q.eq('date', date);
    }

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
    const { data, error } = await supabase.from('attendance')
      .select('*')
      .eq('date', date);

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
    const { data, error } = await supabase.from('attendance')
      .select('*')
      .eq('student_id', studentId);

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
    const { error } = await supabase.from('attendance').upsert(rows);
    if (error) throw error;
  }

  async deleteAttendanceRecords(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await supabase.from('attendance').delete().in('id', ids);
    if (error) throw error;
  }

  async deleteAttendanceForOverwrite(date: string, branchId: string, slot: number): Promise<void> {
    const { error } = await supabase.from('attendance')
      .delete()
      .eq('date', date)
      .eq('branch_id', branchId)
      .eq('lecture_slot', slot);
    if (error) throw error;
  }

  // --- Notifications ---
  async createNotification(data: Omit<Notification, 'id'>): Promise<void> {
    const id = `notif_${Date.now()}`;
    const { error } = await supabase.from('notifications').insert([{
      id,
      to_user_id: data.toUserId,
      from_user_id: data.fromUserId,
      from_user_name: data.fromUserName,
      type: data.type,
      status: data.status,
      data: data.data,
      timestamp: data.timestamp
    }]);
    if (error) throw error;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications')
      .select('*')
      .eq('to_user_id', userId)
      .order('timestamp', { ascending: false });

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

  async updateNotificationStatus(id: string, status: 'READ' | 'ACTIONED' | 'APPROVED' | 'DENIED'): Promise<void> {
    const { error } = await supabase.from('notifications').update({ status }).eq('id', id);
    if (error) throw error;
  }

  async deleteNotification(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    const { error } = await supabase.from('notifications').delete().eq('to_user_id', userId);
    if (error) throw error;
  }

  async seedDatabase(): Promise<void> {
    // Seeding in Supabase is done via SQL or simple inserts
    // Note: Profiles won't link to Auth users automatically unless seeded in auth.users too.
    for (const b of SEED_BRANCHES) await supabase.from('branches').upsert(b);
    for (const b of SEED_BATCHES) await supabase.from('batches').upsert({ id: b.id, name: b.name, branch_id: b.branchId });
    for (const s of SEED_SUBJECTS) await supabase.from('subjects').upsert(s);
  }

  async searchStudents(query: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', UserRole.STUDENT)
      .or(`display_name.ilike.%${query}%,enrollment_id.ilike.%${query}%,mobile_no.ilike.%${query}%`)
      .limit(50);
    if (error) throw error;
    return data.map(p => this.mapProfile(p));
  }

  // --- Marks ---
  async getMarks(branchId: string, batchId: string, subjectId: string, midSemType: MidSemType): Promise<Mark[]> {
    // Fetch students in this branch/batch first
    let studentQuery = supabase.from('profiles')
      .select('id')
      .eq('role', UserRole.STUDENT)
      .eq('branch_id', branchId);

    if (batchId !== 'ALL') {
      studentQuery = studentQuery.eq('batch_id', batchId);
    }

    const { data: students, error: studentError } = await studentQuery;
    if (studentError) throw studentError;

    const studentIds = students.map(s => s.id);
    if (studentIds.length === 0) return [];

    const { data, error } = await supabase.from('marks')
      .select('*')
      .in('student_id', studentIds)
      .eq('subject_id', subjectId)
      .eq('mid_sem_type', midSemType);

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
    const { data, error } = await supabase.from('marks')
      .select('*')
      .eq('student_id', studentId);
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

  async getBranchMarks(branchId: string, midSemType: MidSemType): Promise<Mark[]> {
    const { data: students, error: studentError } = await supabase.from('profiles')
      .select('id')
      .eq('role', UserRole.STUDENT)
      .eq('branch_id', branchId);

    if (studentError) throw studentError;
    const studentIds = students.map(s => s.id);
    if (studentIds.length === 0) return [];

    const { data, error } = await supabase.from('marks')
      .select('*')
      .in('student_id', studentIds)
      .eq('mid_sem_type', midSemType);

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

  async saveMarks(marks: Omit<Mark, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const rows = marks.map(m => ({
      student_id: m.studentId,
      subject_id: m.subjectId,
      faculty_id: m.facultyId,
      mid_sem_type: m.midSemType,
      marks_obtained: m.marksObtained,
      max_marks: m.maxMarks,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('marks').upsert(rows, {
      onConflict: 'student_id,subject_id,mid_sem_type'
    });
    if (error) throw error;
  }

  async getSystemSettings(): Promise<SystemSettings> {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error) throw error;

    const settings: SystemSettings = {
      studentLoginEnabled: true // Default
    };

    data?.forEach(row => {
      if (row.key === 'student_login_enabled') {
        settings.studentLoginEnabled = row.value === true || row.value === 'true' || row.value === JSON.parse('true');
      }
    });

    return settings;
  }

  async updateSystemSettings(settings: SystemSettings): Promise<void> {
    const { error } = await supabase.from('system_settings').upsert({
      key: 'student_login_enabled',
      value: settings.studentLoginEnabled
    });
    if (error) throw error;
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
    const users = this.load('ams_users', SEED_USERS) as User[];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user && (!(user as any).password || (user as any).password === pass)) {
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
}

const hasSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder');
export const db = hasSupabaseKey ? new SupabaseService() : new MockService();
