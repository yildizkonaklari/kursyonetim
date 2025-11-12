// --- Firebase Proje Ayarları Netlify tarafından güvenli bir şekilde eklenecek ---
const firebaseConfig = {
  apiKey: "AIzaSyAh2z7aQRYKfJSjRgiakOj_w8bDZp0crMI",
  authDomain: "kursyonetim-f6ebc.firebaseapp.com",
  projectId: "kursyonetim-f6ebc",
  storageBucket: "kursyonetim-f6ebc.firebasestorage.app",
  messagingSenderId: "790815335813",
  appId: "1:790815335813:web:08fa5776ba8d87d5dfd0ec"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE YÖNETİMİ ---
    let state = {
        students: [],
        courses: [],
        rooms: [],
        users: [] // YENİ: Personel (kullanıcılar) state'i
    };

    let viewDate = new Date();
    let newStudentsChartInstance = null;
    
    // --- DOM ELEMENTLERİ ---
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app');
    const logoutButton = document.getElementById('logout-button');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');
    const menuOverlay = document.getElementById('menu-overlay');

    const authForm = document.getElementById('auth-form');

    // --- YARDIMCI FONKSİYONLARI ---
    function getWeekInfo(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const nextDay = new Date(weekStart);
            nextDay.setDate(weekStart.getDate() + i);
            dates.push(nextDay);
        }
        const weekEnd = new Date(dates[6]);
        weekEnd.setHours(23, 59, 59, 999);

        return { weekStart, weekEnd, dates };
    }
    
    function toggleMenu() {
        sidebar.classList.toggle('-translate-x-full');
        menuOverlay.classList.toggle('hidden');
    }

    // --- VERİ YÖNETİMİ FONKSİYONLARI ---
    // GÜNCELLENDİ: Personel koleksiyonu eklendi
    function loadData() {
        loadingOverlay.classList.remove('hidden');

        // YENİ: Personel (Kullanıcılar) koleksiyonunu dinle
        db.collection('users').onSnapshot(snapshot => {
            state.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateAllSelects(); // Kurs formundaki eğitmen dropdown'ı için
            renderAllPages();
            loadingOverlay.classList.add('hidden');
        }, error => {
            console.error("Personel verisi alınamadı: ", error);
            loadingOverlay.classList.add('hidden');
        });

        // Kursları dinle
        db.collection('courses').onSnapshot(snapshot => {
            state.courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateAllSelects();
            renderAllPages();
            loadingOverlay.classList.add('hidden');
        }, error => {
            console.error("Kurs verisi alınamadı: ", error);
            loadingOverlay.classList.add('hidden');
        });

        // Odaları dinle
        db.collection('rooms').onSnapshot(snapshot => {
            state.rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateAllSelects();
            renderAllPages();
            loadingOverlay.classList.add('hidden');
        }, error => {
            console.error("Oda verisi alınamadı: ", error);
            loadingOverlay.classList.add('hidden');
        });

        // Öğrencileri dinle
        db.collection('students').onSnapshot(snapshot => {
            state.students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAllPages();
            loadingOverlay.classList.add('hidden');
        }, error => {
            console.error("Öğrenci verisi alınamadı: ", error);
            loadingOverlay.classList.add('hidden');
        });
    }

    function renderAllPages() {
        const activePage = document.querySelector('.page.active');
        if (!activePage) return;
        showPage(activePage.id.replace('-page', ''));
    }

    function updateAllSelects() {
        updateStudentFilterOptions();
        updatePaymentFilterOptions();
        updateCalendarFilterOptions();
        updateCalendarRoomFilterOptions();
    }

    // --- GÖRÜNÜM (VIEW) FONKSİYONLARI ---
    // GÜNCELLENDİ: 'users' sayfası eklendi
    function showPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(`${pageId}-page`).classList.add('active');
        
        navLinks.forEach(link => {
            link.classList.remove('bg-indigo-600', 'font-bold');
            if (link.getAttribute('href') === `#${pageId}`) {
                link.classList.add('bg-indigo-600', 'font-bold');
            }
        });

        switch (pageId) {
            case 'dashboard': renderDashboard(); break;
            case 'students': renderStudentsPage(); break;
            case 'users': renderUsersPage(); break; // YENİ
            case 'courses': renderCoursesPage(); break;
            case 'rooms': renderRoomsPage(); break;
            case 'payments': renderPaymentsPage(); break;
            case 'calendar': renderCalendar(); break;
            case 'reports': renderReportsPage(); break;
            case 'how-to-use': break;
        }
    }
    
    function renderDashboard() {
        // ... (Bu fonksiyonda değişiklik yok) ...
        const activeStudents = state.students.filter(s => s.status === 'active');
        let totalBalance = 0;
        let studentsInDebt = 0;
        activeStudents.forEach(s => {
            const balance = (s.payments || []).reduce((sum, p) => sum + p.amount, 0);
            totalBalance += balance;
            if (balance < 0) {
                studentsInDebt++;
            }
        });

        document.getElementById('total-students').textContent = activeStudents.length;
        document.getElementById('total-courses').textContent = state.courses.length;
        document.getElementById('total-balance').textContent = `${totalBalance.toFixed(2)} ₺`;
        document.getElementById('students-in-debt').textContent = studentsInDebt;
        
        const coursesList = document.getElementById('dashboard-courses-list');
        coursesList.innerHTML = '';
        state.courses.forEach(course => {
            const studentCount = state.students.filter(s => s.courseId === course.id && s.status === 'active').length;
            const card = `
                <div class="bg-white p-4 rounded-lg shadow-md">
                    <h3 class="xl font-bold text-gray-800">${course.name}</h3>
                    <p class="text-gray-600">Eğitmen: ${course.instructorName || 'N/A'}</p>
                    <div class="mt-4">
                        <div class="flex justify-between items-center text-sm">
                            <span>Toplam Kayıtlı</span>
                            <span>${studentCount}</span>
                        </div>
                    </div>
                </div>
            `;
            coursesList.innerHTML += card;
        });
    }
    
    function renderStudentsPage() {
        // ... (Bu fonksiyonda değişiklik yok) ...
        const filters = {
            name: document.getElementById('student-search').value,
            courseId: document.getElementById('student-course-filter').value,
            paymentStatus: document.getElementById('student-payment-filter').value,
            status: document.getElementById('student-status-filter').value
        };

        const tableBody = document.getElementById('students-table-body');
        tableBody.innerHTML = '';
        
        let filteredStudents = [...state.students];

        if (filters.status && filters.status !== 'all') {
            filteredStudents = filteredStudents.filter(s => s.status === filters.status);
        }
        if (filters.name) {
            filteredStudents = filteredStudents.filter(s => 
                `${s.firstName} ${s.lastName}`.toLowerCase().includes(filters.name.toLowerCase())
            );
        }
        if (filters.courseId) {
            filteredStudents = filteredStudents.filter(s => s.courseId == filters.courseId);
        }
        if (filters.paymentStatus) {
            filteredStudents = filteredStudents.filter(s => {
                const balance = (s.payments || []).reduce((sum, p) => sum + p.amount, 0);
                const isInDebt = balance < 0;
                return filters.paymentStatus === 'unpaid' ? isInDebt : !isInDebt;
            });
        }

        filteredStudents.forEach(student => {
            const course = state.courses.find(c => c.id === student.courseId);
            const room = course ? state.rooms.find(r => r.id === course.roomId) : null; 
            
            const balance = (student.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const attendedCount = (student.attendance || []).filter(a => a.status === 'geldi').length % (student.lessonsPerFee || 1);
            const isInactive = student.status === 'inactive';

            const row = `
                <tr class="border-b ${isInactive ? 'bg-gray-100 text-gray-500' : ''}">
                    <td class="p-4">
                        <a href="#" class="student-name-link font-semibold hover:underline ${isInactive ? 'text-gray-500' : 'text-indigo-600'}" data-id="${student.id}">${student.firstName} ${student.lastName}</a>
                        <span class="text-sm ml-2">(${attendedCount})</span>
                    </td>
                    <td class="p-4">${course ? course.name : 'Kurs Bulunamadı'}</td>
                    <td class="p-4">${student.day} / ${student.time}</td>
                    <td class="p-4">${room ? room.name : 'N/A'}</td>
                    <td class="p-4 font-semibold ${balance < 0 ? 'text-red-600
