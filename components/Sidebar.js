'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const navConfig = {
    admin: [
        { section: 'Overview' },
        { href: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
        { href: '/admin/iot', icon: '📡', label: 'IoT Monitor' },
        { section: 'Management' },
        { href: '/admin/students', icon: '🧑‍🎓', label: 'Students' },
        { href: '/admin/teachers', icon: '👨‍🏫', label: 'Teachers' },
        { href: '/admin/lectures', icon: '📚', label: 'Lectures' },
        { section: 'Security' },
        { href: '/admin/entry-logs', icon: '🚪', label: 'Entry Logs', badge: null },
        { href: '/admin/alerts', icon: '🔔', label: 'Security Alerts' },
        { section: 'Reports' },
        { href: '/admin/reports', icon: '📈', label: 'Reports & Analytics' },
        { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
    ],
    teacher: [
        { section: 'Overview' },
        { href: '/teacher/dashboard', icon: '📊', label: 'Dashboard' },
        { section: 'Attendance' },
        { href: '/teacher/lecture', icon: '📚', label: 'My Lectures' },
        { href: '/teacher/attendance', icon: '✅', label: 'Attendance Records' },
        { href: '/face-attendance', icon: '📷', label: 'Face Scanner' },
        { section: 'Students' },
        { href: '/teacher/students', icon: '🧑‍🎓', label: 'Student Profiles' },
        { href: '/teacher/reports', icon: '📈', label: 'Reports' },
        { href: '/teacher/notifications', icon: '📲', label: 'Notifications' },
    ],
    student: [
        { section: 'Overview' },
        { href: '/student/dashboard', icon: '📊', label: 'My Dashboard' },
        { section: 'Attendance' },
        { href: '/student/attendance', icon: '✅', label: 'My Attendance' },
        { href: '/face-attendance', icon: '📷', label: 'Face Check-In' },
        { section: 'Profile' },
        { href: '/student/profile', icon: '👤', label: 'My Profile' },
        { href: '/student/profile/face-training', icon: '🧑‍💻', label: 'Face Training' },
        { href: '/student/reports', icon: '📈', label: 'My Reports' },
    ],
};

export default function Sidebar({ role = 'student', user = {} }) {
    const pathname = usePathname();
    const router = useRouter();
    const nav = navConfig[role] || navConfig.student;

    function handleLogout() {
        document.cookie = 'sc_token=; Max-Age=0; path=/';
        localStorage.removeItem('sc_user');
        router.push('/login');
    }

    const initials = user.name
        ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : role[0].toUpperCase();

    return (
        <aside className="sidebar">
            {/* Brand */}
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">🏫</div>
                <div className="sidebar-brand-text">
                    <h2>PSR Campus</h2>
                    <span>IoT Attendance System</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {nav.map((item, i) => {
                    if (item.section) {
                        return (
                            <div key={i} className="sidebar-section-label">{item.section}</div>
                        );
                    }
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={i}
                            href={item.href}
                            onClick={(e) => {
                                // Close sidebar on mobile logic could go here
                            }}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                            {item.badge && <span className="nav-badge">{item.badge}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="sidebar-footer">
                <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
                    <div className="sidebar-user-avatar">{initials}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user.name || 'User'}</div>
                        <div className="sidebar-user-role">{role} · Logout</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>↩</span>
                </div>
            </div>
        </aside>
    );
}
