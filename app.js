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
        rooms: []
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
    
    // Mobile Menu
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');
    const menuOverlay = document.getElementById('menu-overlay');

    // Auth Form Elements
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
    function loadData() {
        loadingOverlay.classList.remove('hidden');

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
            case 'courses': renderCoursesPage(); break;
            case 'rooms': renderRoomsPage(); break;
            case 'payments': renderPaymentsPage(); break;
            case 'calendar': renderCalendar(); break;
            case 'reports': renderReportsPage(); break;
            case 'how-to-use': /* Bu sayfa statik olduğu için özel bir render fonksiyonu yok */ break;
        }
    }
    
    function renderDashboard() {
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
                    <p class="text-gray-600">Eğitmen: ${course.instructor}</p>
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
            const room = state.rooms.find(r => r.id === student.roomId);
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
                    <td class="p-4 font-semibold ${balance < 0 ? 'text-red-600' : 'text-green-600'}">${balance.toFixed(2)} ₺</td>
                    <td class="p-4 text-center">
                        <button class="edit-student-btn text-blue-500 hover:text-blue-700 mr-2" data-id="${student.id}" title="Düzenle"><i class="fas fa-edit"></i></button>
                        <button class="delete-student-btn text-red-500 hover:text-red-700 mr-2" data-id="${student.id}" title="Sil"><i class="fas fa-trash"></i></button>
                        <button class="send-student-info-btn text-green-500 hover:text-green-700 mr-2" data-id="${student.id}" title="Gönder"><i class="fas fa-paper-plane"></i></button>
                        <button class="print-student-btn text-gray-500 hover:text-gray-700 mr-2" data-id="${student.id}" title="Yazdır"><i class="fas fa-print"></i></button>
                        <a href="#" class="add-to-calendar-btn text-blue-500 hover:text-blue-700" data-id="${student.id}" title="Google Takvim'e Ekle"><i class="fas fa-calendar-plus"></i></a>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }
    
    function updateStudentFilterOptions() {
        const courseFilter = document.getElementById('student-course-filter');
        const currentVal = courseFilter.value;
        courseFilter.innerHTML = '<option value="">Tüm Kurslar</option>';
        state.courses.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            courseFilter.appendChild(option);
        });
        courseFilter.value = currentVal;
    }

    function updatePaymentFilterOptions() {
        const courseFilter = document.getElementById('payment-course-filter');
        const currentVal = courseFilter.value;
        courseFilter.innerHTML = '<option value="">Tüm Kurslar</option>';
        state.courses.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            courseFilter.appendChild(option);
        });
        courseFilter.value = currentVal;
    }

    function updateCalendarFilterOptions() {
        const filter = document.getElementById('calendar-course-filter');
        const currentVal = filter.value;
        filter.innerHTML = '';
        state.courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name;
            filter.appendChild(option);
        });
        if (currentVal && state.courses.some(c => c.id == currentVal)) {
             filter.value = currentVal;
        }
    }
    
    function updateCalendarRoomFilterOptions() {
        const filter = document.getElementById('calendar-room-filter');
        const currentVal = filter.value;
        filter.innerHTML = '<option value="">Tüm Odalar</option>'; // Varsayılan
        state.rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.name;
            filter.appendChild(option);
        });
        if (currentVal && state.rooms.some(r => r.id == currentVal)) {
             filter.value = currentVal;
        }
    }

    function renderCoursesPage() {
        const tableBody = document.getElementById('courses-table-body');
        tableBody.innerHTML = '';
        state.courses.forEach(course => {
            const studentCount = state.students.filter(s => s.courseId === course.id && s.status === 'active').length;
            const row = `
                <tr class="border-b">
                    <td class="p-4 font-medium">${course.name}</td>
                    <td class="p-4">${course.instructor}</td>
                    <td class="p-4">${course.duration || 60}</td>
                    <td class="p-4">${course.quota}</td>
                    <td class="p-4">${studentCount}</td>
                    <td class="p-4 text-center">
                        <button class="edit-course-btn text-blue-500 hover:text-blue-700 mr-2" data-id="${course.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-course-btn text-red-500 hover:text-red-700" data-id="${course.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }
    
    function renderRoomsPage() {
        const tableBody = document.getElementById('rooms-table-body');
        tableBody.innerHTML = '';
        state.rooms.forEach(room => {
            const row = `
                <tr class="border-b">
                    <td class="p-4 font-medium">${room.name}</td>
                    <td class="p-4">${room.capacity}</td>
                    <td class="p-4 text-center">
                        <button class="edit-room-btn text-blue-500 hover:text-blue-700 mr-2" data-id="${room.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-room-btn text-red-500 hover:text-red-700" data-id="${room.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }
    
    function renderPaymentsPage(filters = {}) {
         const tableBody = document.getElementById('payments-table-body');
         tableBody.innerHTML = '';
         let studentsToDisplay = [...state.students];

         if (filters.name) {
            studentsToDisplay = studentsToDisplay.filter(s =>
                `${s.firstName} ${s.lastName}`.toLowerCase().includes(filters.name.toLowerCase())
            );
        }
        if (filters.courseId) {
            studentsToDisplay = studentsToDisplay.filter(s => s.courseId == filters.courseId);
        }
        if (filters.paymentStatus) {
            studentsToDisplay = studentsToDisplay.filter(s => {
                const balance = (s.payments || []).reduce((sum, p) => sum + p.amount, 0);
                const isInDebt = balance < 0;
                return filters.paymentStatus === 'unpaid' ? isInDebt : !isInDebt;
            });
        }

         studentsToDisplay.forEach(student => {
            const course = state.courses.find(c => c.id === student.courseId);
            if (!course) return;

            const balance = (student.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const statusClass = balance >= 0 ? 'status-paid' : 'status-unpaid';
            const statusText = balance >= 0 ? 'Borcu Yok' : 'Borçlu';

            const row = `
                <tr class="border-b">
                    <td class="p-4">${student.firstName} ${student.lastName}</td>
                    <td class="p-4">${course.name}</td>
                    <td class="p-4 font-bold ${balance < 0 ? 'text-red-600' : 'text-green-600'}">${balance.toFixed(2)} ₺</td>
                    <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${statusText}</span></td>
                    <td class="p-4 text-center">
                        <button class="add-payment-btn bg-yellow-500 text-white px-3 py-1 rounded shadow hover:bg-yellow-600" data-id="${student.id}">Ödeme Ekle</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
         });
    }
    
    // --- TAKVİM FONKSİYONLARI ---
    
    function renderCalendar() {
        const view = document.getElementById('calendar-view-toggle').dataset.view;
        const courseViewContainer = document.getElementById('calendar-view-course');
        const roomViewContainer = document.getElementById('calendar-view-room');
        const courseFilter = document.getElementById('calendar-course-filter');
        const roomFilter = document.getElementById('calendar-room-filter');

        if (view === 'room') {
            courseViewContainer.classList.add('hidden');
            roomViewContainer.classList.remove('hidden');
            courseFilter.classList.add('hidden');
            roomFilter.classList.remove('hidden');
            renderRoomCalendarGrids();
        } else {
            courseViewContainer.classList.remove('hidden');
            roomViewContainer.classList.add('hidden');
            courseFilter.classList.remove('hidden');
            roomFilter.classList.add('hidden');
            renderCourseCalendarGrid();
        }
    }
    
    function renderCourseCalendarGrid() {
        const grid = document.getElementById('calendar-grid');
        const weekRangeDisplay = document.getElementById('week-range-display');
        grid.innerHTML = '';
        
        grid.style.gridTemplateColumns = '60px repeat(7, 1fr)';
        
        const weekInfo = getWeekInfo(viewDate);
        const { weekStart, weekEnd, dates } = weekInfo;
        const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const fullDayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        const timeSlots = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`);
        const filterCourseId = document.getElementById('calendar-course-filter').value;
        const today = new Date();
        today.setHours(0,0,0,0);

        const options = { month: 'short', day: 'numeric' };
        weekRangeDisplay.textContent = `${weekStart.toLocaleDateString('tr-TR', options)} - ${weekEnd.toLocaleDateString('tr-TR', options)} ${weekStart.getFullYear()}`;

        // Header
        grid.innerHTML += `<div class="font-semibold p-2 text-center text-sm"></div>`;
        dates.forEach((date, i) => {
            const isToday = date.getTime() === today.getTime();
            grid.innerHTML += `<div class="font-semibold p-2 text-center text-sm ${isToday ? 'bg-blue-100 rounded-t' : ''}">${dayNames[i]}<br>${date.getDate()}</div>`;
        });

        const activeStudents = state.students.filter(s => s.status === 'active');
        const allMakeupsThisWeek = activeStudents.flatMap(s => s
