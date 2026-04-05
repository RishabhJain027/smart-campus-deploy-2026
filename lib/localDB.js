// lib/localDB.js
// In-memory + file-backed data store for when Firebase is not configured.
// This lets the entire app work without any external services.
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DB_PATH, 'users.json');
const ATTENDANCE_FILE = path.join(DB_PATH, 'attendance.json');
const ENTRIES_FILE = path.join(DB_PATH, 'entries.json');

function ensureDir() {
    if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });
}

function readJSON(filePath, fallback = []) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch { return fallback; }
}

function writeJSON(filePath, data) {
    ensureDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─── SEED DATA ────────────────────────────────────────────
import bcrypt from 'bcryptjs';

const SEED_PASSWORD_HASH = bcrypt.hashSync('Test@1234', 12);

const SEED_USERS = [
    {
        id: 'admin_001', name: 'System Admin', email: 'admin@admin',
        password_hash: bcrypt.hashSync('admin@admin', 12),
        role: 'admin', department: 'Administration', phone: '+91-9999999999',
        approved: true, semester: '', created_at: new Date().toISOString(),
    },
    {
        id: 'student_001', name: 'Rishabh Jain', email: 'rishabh@student.com',
        password_hash: SEED_PASSWORD_HASH,
        rfid_uid: '', face_status: 'trained', wallet_balance: 60550,
        role: 'student', department: 'Computer Science', semester: '4', phone: '+91-9876543210',
        approved: true, created_at: new Date().toISOString(),
    },
    {
        id: 'student_002', name: 'Priya Sharma', email: 'priya@student.com',
        password_hash: SEED_PASSWORD_HASH, rfid_uid: '', face_status: 'unregistered', wallet_balance: 120,
        role: 'student', department: 'Computer Science', semester: '4', phone: '+91-9876543211',
        approved: true, created_at: new Date().toISOString(),
    },
    {
        id: 'student_003', name: 'Arjun Singh', email: 'arjun@student.com',
        password_hash: SEED_PASSWORD_HASH, rfid_uid: '', face_status: 'unregistered', wallet_balance: 300,
        role: 'student', department: 'Information Technology', semester: '4', phone: '+91-9876543212',
        approved: true, created_at: new Date().toISOString(),
    },
    {
        id: 'student_004', name: 'Sneha Patel', email: 'sneha@student.com',
        password_hash: SEED_PASSWORD_HASH, rfid_uid: '', face_status: 'unregistered', wallet_balance: 1000,
        role: 'student', department: 'Electronics', semester: '6', phone: '+91-9876543213',
        approved: true, created_at: new Date().toISOString(),
    },
    {
        id: 'student_005', name: 'Rahul Kumar', email: 'rahul@student.com',
        password_hash: SEED_PASSWORD_HASH, rfid_uid: '', face_status: 'unregistered', wallet_balance: 50,
        role: 'student', department: 'Computer Science', semester: '4', phone: '+91-9876543214',
        approved: true, created_at: new Date().toISOString(),
    },
    {
        id: 'student_006', name: 'Piyush', email: 'piyush@student.com',
        password_hash: SEED_PASSWORD_HASH, rfid_uid: '83 F4 EE 28', face_status: 'trained', wallet_balance: 200,
        role: 'student', department: 'Computer Science', semester: '4', phone: '+91-1234567890',
        approved: true, created_at: new Date().toISOString(),
    },
    {
        id: 'student_007', name: 'Shravani', email: 'shravani@student.com',
        password_hash: SEED_PASSWORD_HASH, rfid_uid: '23 AE D7 13', face_status: 'trained', wallet_balance: 850,
        role: 'student', department: 'Computer Science', semester: '4', phone: '+91-0987654321',
        approved: true, created_at: new Date().toISOString(),
    },
    {
        id: 'teacher_001', name: 'Dr. Meera Sharma', email: 'meera@teacher.com',
        password_hash: SEED_PASSWORD_HASH,
        role: 'teacher', department: 'Computer Science', phone: '+91-9988776655',
        approved: true, semester: '', created_at: new Date().toISOString(),
    },
    {
        id: 'teacher_002', name: 'Prof. Ramesh Gupta', email: 'ramesh@teacher.com',
        password_hash: SEED_PASSWORD_HASH,
        role: 'teacher', department: 'Information Technology', phone: '+91-9988776656',
        approved: true, semester: '', created_at: new Date().toISOString(),
    },
];

const SEED_ATTENDANCE = [
    // Rishabh's attendance
    { id: 'att_001', student_id: 'student_001', student_name: 'Rishabh Jain', subject: 'Data Structures', date: '2026-04-01', status: 'present', method: 'RFID', teacher_id: 'teacher_001' },
    { id: 'att_002', student_id: 'student_001', student_name: 'Rishabh Jain', subject: 'Data Structures', date: '2026-04-02', status: 'present', method: 'Face', teacher_id: 'teacher_001' },
    { id: 'att_003', student_id: 'student_001', student_name: 'Rishabh Jain', subject: 'Data Structures', date: '2026-04-03', status: 'absent', method: '-', teacher_id: 'teacher_001' },
    { id: 'att_004', student_id: 'student_001', student_name: 'Rishabh Jain', subject: 'Computer Networks', date: '2026-04-01', status: 'present', method: 'RFID', teacher_id: 'teacher_002' },
    { id: 'att_005', student_id: 'student_001', student_name: 'Rishabh Jain', subject: 'Computer Networks', date: '2026-04-02', status: 'absent', method: '-', teacher_id: 'teacher_002' },
    { id: 'att_006', student_id: 'student_001', student_name: 'Rishabh Jain', subject: 'DBMS', date: '2026-04-01', status: 'present', method: 'RFID', teacher_id: 'teacher_001' },
    { id: 'att_007', student_id: 'student_001', student_name: 'Rishabh Jain', subject: 'DBMS', date: '2026-04-02', status: 'present', method: 'Face', teacher_id: 'teacher_001' },
    { id: 'att_008', student_id: 'student_001', student_name: 'Rishabh Jain', subject: 'DBMS', date: '2026-04-03', status: 'present', method: 'RFID', teacher_id: 'teacher_001' },
    // Priya's attendance
    { id: 'att_009', student_id: 'student_002', student_name: 'Priya Sharma', subject: 'Data Structures', date: '2026-04-01', status: 'present', method: 'Face', teacher_id: 'teacher_001' },
    { id: 'att_010', student_id: 'student_002', student_name: 'Priya Sharma', subject: 'Data Structures', date: '2026-04-02', status: 'present', method: 'RFID', teacher_id: 'teacher_001' },
    { id: 'att_011', student_id: 'student_002', student_name: 'Priya Sharma', subject: 'Data Structures', date: '2026-04-03', status: 'present', method: 'RFID', teacher_id: 'teacher_001' },
    // Arjun
    { id: 'att_012', student_id: 'student_003', student_name: 'Arjun Singh', subject: 'Data Structures', date: '2026-04-01', status: 'present', method: 'RFID', teacher_id: 'teacher_001' },
    { id: 'att_013', student_id: 'student_003', student_name: 'Arjun Singh', subject: 'Data Structures', date: '2026-04-02', status: 'absent', method: '-', teacher_id: 'teacher_001' },
    // Sneha
    { id: 'att_014', student_id: 'student_004', student_name: 'Sneha Patel', subject: 'Data Structures', date: '2026-04-01', status: 'present', method: 'Face', teacher_id: 'teacher_001' },
    { id: 'att_015', student_id: 'student_004', student_name: 'Sneha Patel', subject: 'Data Structures', date: '2026-04-02', status: 'present', method: 'RFID', teacher_id: 'teacher_001' },
    // Rahul
    { id: 'att_016', student_id: 'student_005', student_name: 'Rahul Kumar', subject: 'Data Structures', date: '2026-04-01', status: 'absent', method: '-', teacher_id: 'teacher_001' },
    { id: 'att_017', student_id: 'student_005', student_name: 'Rahul Kumar', subject: 'Data Structures', date: '2026-04-02', status: 'absent', method: '-', teacher_id: 'teacher_001' },
];

const SEED_ENTRIES = [
    { id: 'ent_001', student_id: 'student_001', name: 'Rishabh Jain', gate: 'Main Gate', method: 'RFID', time: '2026-04-05T09:02:00', status: 'granted' },
    { id: 'ent_002', student_id: 'student_002', name: 'Priya Sharma', gate: 'Main Gate', method: 'Face', time: '2026-04-05T09:04:00', status: 'granted' },
    { id: 'ent_003', student_id: 'student_003', name: 'Arjun Singh', gate: 'Side Gate', method: 'RFID', time: '2026-04-05T09:05:00', status: 'granted' },
    { id: 'ent_004', student_id: 'student_004', name: 'Sneha Patel', gate: 'Main Gate', method: 'Face', time: '2026-04-05T09:08:00', status: 'granted' },
    { id: 'ent_005', student_id: 'student_001', name: 'Rishabh Jain', gate: 'Main Gate', method: 'RFID', time: '2026-04-04T09:01:00', status: 'granted' },
];

// ─── Initialize DB ──────────────────────────────────────────
function initDB() {
    ensureDir();
    if (!fs.existsSync(USERS_FILE)) writeJSON(USERS_FILE, SEED_USERS);
    if (!fs.existsSync(ATTENDANCE_FILE)) writeJSON(ATTENDANCE_FILE, SEED_ATTENDANCE);
    if (!fs.existsSync(ENTRIES_FILE)) writeJSON(ENTRIES_FILE, SEED_ENTRIES);
}
initDB();

// ─── CRUD Operations ────────────────────────────────────────
export const localDB = {
    // Users
    getUsers() { return readJSON(USERS_FILE, SEED_USERS); },
    getUserByEmail(email, role) {
        const users = this.getUsers();
        return users.find(u => u.email === email && (!role || u.role === role));
    },
    getUserById(id) {
        return this.getUsers().find(u => u.id === id);
    },
    addUser(user) {
        const users = this.getUsers();
        users.push(user);
        writeJSON(USERS_FILE, users);
        return user;
    },
    updateUser(id, updates) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx !== -1) { users[idx] = { ...users[idx], ...updates }; writeJSON(USERS_FILE, users); }
        return users[idx];
    },
    getStudents() { return this.getUsers().filter(u => u.role === 'student'); },
    getTeachers() { return this.getUsers().filter(u => u.role === 'teacher'); },

    // Attendance
    getAttendance() { return readJSON(ATTENDANCE_FILE, SEED_ATTENDANCE); },
    getAttendanceByStudent(studentId) {
        return this.getAttendance().filter(a => a.student_id === studentId);
    },
    getAttendanceBySubject(subject) {
        return this.getAttendance().filter(a => a.subject === subject);
    },
    getAttendanceByDate(date) {
        return this.getAttendance().filter(a => a.date === date);
    },
    addAttendance(record) {
        const records = this.getAttendance();
        records.push(record);
        writeJSON(ATTENDANCE_FILE, records);
        return record;
    },

    // Entry logs
    getEntries() { return readJSON(ENTRIES_FILE, SEED_ENTRIES); },
    getEntriesByStudent(studentId) {
        return this.getEntries().filter(e => e.student_id === studentId).sort((a, b) => new Date(b.time) - new Date(a.time));
    },
    addEntry(entry) {
        const entries = this.getEntries();
        entries.push(entry);
        writeJSON(ENTRIES_FILE, entries);
        return entry;
    },
};
