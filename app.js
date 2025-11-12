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
        users: [] // *** YENİ: Personel (Eğitmen/Admin) listesi ***
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
    function loadData() {
        loadingOverlay.classList.remove('hidden');

        // *** YENİ: Personel listesini dinle ***
        db.collection('users').onSnapshot(snapshot => {
            state.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateAllSelects();
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
            case 'users': renderUsersPage(); break; // *** YENİ ***
            case 'courses': renderCoursesPage(); break;
            case 'rooms': renderRoomsPage(); break;
            case 'payments': renderPaymentsPage(); break;
            case 'calendar': renderCalendar(); break;
            case 'reports': renderReportsPage(); break;
            case 'how-to-use': break; // Kılavuzu daha sonra güncelleyeceğiz
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
                    <p class="text-gray-600">Eğitmen: ${course.instructorName || 'Atanmamış'}</p> 
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
            const room = course ? state.rooms.find(r => r.id === course.roomId) : null; 
            
            const balance = (student.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const attendedCount = (student.attendance || []).filter(a => a.status === 'geldi' || a.status === 'gelmedi').length % (student.lessonsPerFee || 1);
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
    
    // *** YENİ: Personel Sayfasını Render Et ***
    function renderUsersPage() {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '';
        state.users.forEach(user => {
            const roleText = user.role === 'admin' ? 'Yönetici' : 'Eğitmen';
            const roleClass = user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800';
            
            const row = `
                <tr class="border-b">
                    <td class="p-4 font-medium">${user.name}</td>
                    <td class="p-4">${user.email}</td>
                    <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${roleClass}">${roleText}</span></td>
                    <td class="p-4">${user.phone || 'N/A'}</td>
                    <td class="p-4">${user.startDate ? new Date(user.startDate).toLocaleDateString('tr-TR') : 'N/A'}</td>
                    <td class="p-4 text-center">
                        <button class="edit-user-btn text-blue-500 hover:text-blue-700 mr-2" data-id="${user.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-user-btn text-red-500 hover:text-red-700" data-id="${user.id}"><i class="fas fa-trash"></i></button>
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
        filter.innerHTML = '<option value="">Tüm Odalar</option>';
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

    // GÜNCELLENDİ: Artık `instructorName` kullanıyor
    function renderCoursesPage() {
        const tableBody = document.getElementById('courses-table-body');
        tableBody.innerHTML = '';
        state.courses.forEach(course => {
            const studentCount = state.students.filter(s => s.courseId === course.id && s.status === 'active').length;
            const room = state.rooms.find(r => r.id === course.roomId);
            
            const row = `
                <tr class="border-b">
                    <td class="p-4 font-medium">${course.name}</td>
                    <td class="p-4">${course.instructorName || 'Atanmamış'}</td>
                    <td class="p-4">${room ? room.name : 'Oda Yok'}</td>
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

        grid.innerHTML += `<div class="font-semibold p-2 text-center text-sm"></div>`;
        dates.forEach((date, i) => {
            const isToday = date.getTime() === today.getTime();
            grid.innerHTML += `<div class="font-semibold p-2 text-center text-sm ${isToday ? 'bg-blue-100 rounded-t' : ''}">${dayNames[i]}<br>${date.getDate()}</div>`;
        });

        const activeStudents = state.students.filter(s => s.status === 'active');
        const allMakeupsThisWeek = activeStudents.flatMap(s => s.attendance || []).filter(a => {
            if (a.status !== 'telafi' || !a.date) return false;
            const makeupDate = new Date(a.date);
            makeupDate.setHours(0,0,0,0);
            return makeupDate >= weekStart && makeupDate <= weekEnd;
        });

        timeSlots.forEach(time => {
            grid.innerHTML += `<div class="font-semibold p-2 text-center text-sm flex items-center justify-center">${time}</div>`;
            dates.forEach((date, i) => {
                const day = fullDayNames[i];
                const isToday = date.getTime() === today.getTime();
                
                let studentsInSlot = activeStudents.filter(s => s.day === day && s.time.startsWith(time.substring(0,2)));
                let makeupsInSlot = allMakeupsThisWeek.filter(m => {
                    const makeupDate = new Date(m.date);
                    return makeupDate.getDate() === date.getDate() && m.time.startsWith(time.substring(0,2));
                });
                
                if (filterCourseId) {
                    studentsInSlot = studentsInSlot.filter(s => s.courseId == filterCourseId);
                    makeupsInSlot = makeupsInSlot.filter(m => {
                        const student = state.students.find(s => s.id == m.studentId);
                        return student && student.courseId == filterCourseId;
                    });
                }
                
                let slotContentHTML = '';
                
                studentsInSlot.forEach(student => {
                    const course = state.courses.find(c => c.id === student.courseId);
                    const room = course ? state.rooms.find(r => r.id === course.roomId) : null;
                    if (course) {
                        slotContentHTML += `<div class="available calendar-event p-1 rounded mb-1 text-[11px] leading-tight border border-blue-200" data-student-id="${student.id}">
                                            <p class="font-bold">${course.name}</p>
                                            <p>${student.firstName} (${student.time})</p>
                                            <p class="font-semibold text-blue-700">${room ? room.name : 'Oda Yok'}</p>
                                         </div>`;
                    }
                });
                
                makeupsInSlot.forEach(makeup => {
                     const student = state.students.find(s => s.id == makeup.studentId);
                     if (student) {
                         const course = state.courses.find(c => c.id === student.courseId);
                         const room = course ? state.rooms.find(r => r.id === course.roomId) : null;
                         if (course) {
                             slotContentHTML += `<div class="makeup calendar-event p-1 rounded mb-1 text-[11px] leading-tight border border-yellow-300" data-student-id="${student.id}">
                                                <p class="font-bold">${course.name} (Telafi)</p>
                                                <p>${student.firstName} (${makeup.time})</p>
                                                <p class="font-semibold text-yellow-700">${room ? room.name : 'Oda Yok'}</p>
                                             </div>`;
                         }
                     }
                });

                const todayClass = isToday ? 'bg-blue-50' : '';
                if (slotContentHTML === '') {
                    grid.innerHTML += `<div class="calendar-slot empty ${todayClass}"></div>`;
                } else {
                    grid.innerHTML += `<div class="calendar-slot p-1 overflow-y-auto ${todayClass}">${slotContentHTML}</div>`;
                }
            });
        });
    }
    
    function renderRoomCalendarGrids() {
        const container = document.getElementById('calendar-view-room');
        const weekRangeDisplay = document.getElementById('week-range-display');
        container.innerHTML = ''; 

        const weekInfo = getWeekInfo(viewDate);
        const { weekStart, weekEnd, dates } = weekInfo;
        const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const fullDayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        const timeSlots = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const options = { month: 'short', day: 'numeric' };
        weekRangeDisplay.textContent = `${weekStart.toLocaleDateString('tr-TR', options)} - ${weekEnd.toLocaleDateString('tr-TR', options)} ${weekStart.getFullYear()}`;

        const activeStudents = state.students.filter(s => s.status === 'active');
        
        const filterRoomId = document.getElementById('calendar-room-filter').value;
        let roomsToRender = state.rooms;
        
        if (filterRoomId) {
            roomsToRender = state.rooms.filter(r => r.id === filterRoomId);
        }

        roomsToRender.forEach(room => {
            let gridHtml = `<div class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">`;
            gridHtml += `<h3 class="text-xl font-bold mb-4 text-indigo-700">${room.name}</h3>`;
            gridHtml += `<div class="grid" style="grid-template-columns: 60px repeat(7, 1fr); min-width: 600px;">`;

            gridHtml += `<div class="font-semibold p-2 text-center text-sm"></div>`;
            dates.forEach((date, i) => {
                const isToday = date.getTime() === today.getTime();
                gridHtml += `<div class="font-semibold p-2 text-center text-sm ${isToday ? 'bg-blue-100 rounded-t' : ''}">${dayNames[i]}<br>${date.getDate()}</div>`;
            });

            timeSlots.forEach(time => {
                gridHtml += `<div class="font-semibold p-2 text-center text-sm flex items-center justify-center border-t">${time}</div>`;
                dates.forEach((date, i) => {
                    const day = fullDayNames[i];
                    const isToday = date.getTime() === today.getTime();
                    
                    let studentsInSlot = activeStudents.filter(s => {
                        const course = state.courses.find(c => c.id === s.courseId);
                        return s.day === day && 
                               s.time.startsWith(time.substring(0,2)) && 
                               course &&
                               course.roomId === room.id;
                    });
                    
                    let slotContentHTML = '';
                    studentsInSlot.forEach(student => {
                        const course = state.courses.find(c => c.id === student.courseId);
                        slotContentHTML += `<div class="available calendar-event p-1 rounded mb-1 text-[11px] leading-tight border border-blue-200" data-student-id="${student.id}">
                                            <p class="font-bold">${course ? course.name : ''}</p>
                                            <p>${student.firstName} (${student.time})</p>
                                         </div>`;
                    });

                    const todayClass = isToday ? 'bg-blue-50' : '';
                    if (slotContentHTML === '') {
                        gridHtml += `<div class="calendar-slot empty ${todayClass} border-t"></div>`;
                    } else {
                        gridHtml += `<div class="calendar-slot p-1 overflow-y-auto ${todayClass} border-t">${slotContentHTML}</div>`;
                    }
                });
            });

            gridHtml += `</div></div>`;
            container.innerHTML += gridHtml;
        });
        
        if (roomsToRender.length === 0 && filterRoomId === "") {
             container.innerHTML = `<p class="text-center text-gray-500">Lütfen önce "Odalar" sayfasından bir oda ekleyin.</p>`;
        }
    }
    
    // --- MODAL FONKSİYONLARI ---
    function showModal(content) {
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
    }

    function hideModal() {
        modal.classList.add('hidden');
        modalContent.innerHTML = '';
    }
    
    function getStudentFormHTML(student = {}) {
        const isEditing = !!student.id;
        const title = isEditing ? 'Öğrenci Bilgilerini Düzenle' : 'Yeni Öğrenci Ekle';
        
        let courseOptions = state.courses.map(c => {
            const room = state.rooms.find(r => r.id === c.roomId);
            const roomName = room ? room.name : 'Oda Atanmamış';
            return `<option value="${c.id}" ${student.courseId == c.id ? 'selected' : ''}>${c.name} (${roomName})</option>`;
        }).join('');
        
        const daysOfWeek = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        let dayOptions = daysOfWeek.map(d => `<option value="${d}" ${student.day === d ? 'selected' : ''}>${d}</option>`).join('');
        
        return `
            <div>
                <h2 class="text-2xl font-bold mb-6">${title}</h2>
            </div>
            <div>
                <form id="student-form" data-id="${student.id || ''}">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="firstName" placeholder="Ad" value="${student.firstName || ''}" required class="p-2 border rounded">
                        <input type="text" name="lastName" placeholder="Soyad" value="${student.lastName || ''}" required class="p-2 border rounded">
                        
                        <input type="tel" name="phone" placeholder="Telefon (WhatsApp/Veli)" value="${student.phone || ''}" class="p-2 border rounded">
                        <input type="email" name="email" placeholder="E-posta (Takvim/Bilgi)" value="${student.email || ''}" class="p-2 border rounded">
                        
                        <div class="md:col-span-2">
                           <label class="block text-sm font-medium text-gray-700">Kurs (ve Odası)</label>
                           <select name="courseId" required class="mt-1 block w-full p-2 border rounded">
                                <option value="">Kurs Seçin...</option>
                                ${courseOptions}
                           </select>
                        </div>

                        <input type="date" name="registrationDate" value="${student.registrationDate || new Date().toISOString().slice(0,10)}" required class="p-2 border rounded">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Dönem Ücreti</label>
                            <input type="number" name="fee" placeholder="Ücret (₺)" value="${student.fee || ''}" required class="mt-1 w-full p-2 border rounded">
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-gray-700">Ders Sayısı</label>
                            <input type="number" name="lessonsPerFee" placeholder="Ücrete dahil ders" value="${student.lessonsPerFee || '4'}" required class="mt-1 w-full p-2 border rounded">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Ders Günü</label>
                            <select name="day" required class="mt-1 block w-full p-2 border rounded">${dayOptions}</select>
                        </div>
                        <div>
                           <label class="block text-sm font-medium text-gray-700">Ders Saati</label>
                           <input type="time" name="time" value="${student.time || '09:00'}" required class="mt-1 block w-full p-2 border rounded">
                        </div>
                    </div>
                    <textarea name="notes" placeholder="Özel Notlar..." class="w-full p-2 border rounded mt-4">${student.notes || ''}</textarea>
                </form>
            </div>
            
            <p id="form-error" class="text-red-600 text-sm mt-4 text-center min-h-[1.25rem]"></p> 
            
            <div class="flex justify-end mt-4 gap-4">
                <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
                <button type="submit" form="student-form" class="bg-indigo-600 text-white px-4 py-2 rounded">${isEditing ? 'Güncelle' : 'Kaydet'}</button>
            </div>
        `;
    }
    
    // GÜNCELLENDİ: Artık eğitmenler `state.users`'dan gelen bir dropdown
    function getCourseFormHTML(course = {}) {
        const isEditing = !!course.id;
        const title = isEditing ? 'Kurs Bilgilerini Düzenle' : 'Yeni Kurs Ekle';
        
        let roomOptions = state.rooms.map(r => `<option value="${r.id}" ${course.roomId == r.id ? 'selected' : ''}>${r.name} (Kapasite: ${r.capacity})</option>`).join('');
        
        // YENİ: Eğitmenleri (rolü "instructor" olan) al
        let instructorOptions = state.users
            .filter(u => u.role === 'instructor')
            .map(u => `<option value="${u.id}" data-name="${u.name}" ${course.instructorId == u.id ? 'selected' : ''}>${u.name}</option>`)
            .join('');

        return `
             <h2 class="text-2xl font-bold mb-6">${title}</h2>
             <form id="course-form" data-id="${course.id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" placeholder="Kurs Adı" value="${course.name || ''}" required class="p-2 border rounded">
                    
                    <select name="instructorId" required class="p-2 border rounded">
                        <option value="">Eğitmen Seçin...</option>
                        ${instructorOptions}
                    </select>
                </div>
                 <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label class="block text-sm font-medium text-gray-700">Kontenjan</label>
                        <input type="number" name="quota" placeholder="8" value="${course.quota || ''}" required class="w-full p-2 border rounded">
                     </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700">Ders Süresi (dakika)</label>
                        <input type="number" name="duration" placeholder="60" value="${course.duration || '60'}" required class="w-full p-2 border rounded">
                     </div>
                 </div>
                 <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700">Atanacak Oda</label>
                    <select name="roomId" required class="mt-1 block w-full p-2 border rounded">
                        <option value="">Oda Seçin...</option>
                        ${roomOptions}
                    </select>
                 </div>
             </form>
             
             <p id="form-error" class="text-red-600 text-sm mt-4 text-center min-h-[1.25rem]"></p> 

             <div class="flex justify-end mt-4 gap-4">
                <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
                <button type="submit" form="course-form" class="bg-green-600 text-white px-4 py-2 rounded">${isEditing ? 'Güncelle' : 'Kaydet'}</button>
             </div>
        `;
    }
    
    function getRoomFormHTML(room = {}) {
        const isEditing = !!room.id;
        const title = isEditing ? 'Oda Bilgilerini Düzenle' : 'Yeni Oda Ekle';
        return `
             <h2 class="text-2xl font-bold mb-6">${title}</h2>
             <form id="room-form" data-id="${room.id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" placeholder="Oda Adı (Örn: Atölye 1)" value="${room.name || ''}" required class="p-2 border rounded">
                    <input type="number" name="capacity" placeholder="Kapasite" value="${room.capacity || ''}" required class="p-2 border rounded">
                </div>
             </form>
             
             <p id="form-error" class="text-red-600 text-sm mt-4 text-center min-h-[1.25rem]"></p> 

             <div class="flex justify-end mt-4 gap-4">
                <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
                <button type="submit" form="room-form" class="bg-blue-600 text-white px-4 py-2 rounded">${isEditing ? 'Güncelle' : 'Kaydet'}</button>
             </div>
        `;
    }

    // *** YENİ: Personel Ekleme/Düzenleme Formu ***
    function getUserFormHTML(user = {}) {
        const isEditing = !!user.id;
        const title = isEditing ? 'Personel Bilgilerini Düzenle' : 'Yeni Personel Ekle';
        
        // Yeni kullanıcı eklerken şifre alanı göster, düzenlerken gösterme (Aşama 2'de kullanılacak)
        const passwordHTML = !isEditing ? `
            <div class="mb-4">
                <label for="password" class="block text-sm font-medium text-gray-700">Geçici Şifre (Giriş için)</label>
                <input type="password" name="password" required class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
        ` : '';

        return `
             <h2 class="text-2xl font-bold mb-6">${title}</h2>
             <form id="user-form" data-id="${user.id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" placeholder="Ad Soyad" value="${user.name || ''}" required class="p-2 border rounded">
                    <input type="email" name="email" placeholder="E-posta (Giriş için)" value="${user.email || ''}" required class="p-2 border rounded">
                </div>
                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="tel" name="phone" placeholder="Telefon (5XX...)" value="${user.phone || ''}" class="p-2 border rounded">
                    <input type="date" name="startDate" value="${user.startDate || new Date().toISOString().slice(0,10)}" required class="p-2 border rounded">
                </div>
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700">Rol</label>
                    <select name="role" required class="mt-1 block w-full p-2 border rounded">
                        <option value="instructor" ${user.role === 'instructor' ? 'selected' : ''}>Eğitmen</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Yönetici (Admin)</option>
                    </select>
                </div>
                <textarea name="notes" placeholder="Personel hakkında notlar..." class="w-full p-2 border rounded mt-4">${user.notes || ''}</textarea>
                
                ${passwordHTML} 
                
             </form>
             
             <p id="form-error" class="text-red-600 text-sm mt-4 text-center min-h-[1.25rem]"></p> 

             <div class="flex justify-end mt-4 gap-4">
                <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
                <button type="submit" form="user-form" class="bg-teal-600 text-white px-4 py-2 rounded">${isEditing ? 'Güncelle' : 'Kaydet'}</button>
             </div>
        `;
    }
    
    function getPaymentFormHTML(student) {
        //... (Bu fonksiyonda değişiklik yok)
    }
    
    function getStudentStatusModalHTML(student) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    function getSendInfoModalHTML(student) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    function generateStudentInfoText(studentId) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    function generateStudentInfoHTML(studentId) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    // --- OLAY YÖNETİCİLERİ (EVENT HANDLERS) ---
    function handleNavigation(e) {
        e.preventDefault();
        const link = e.target.closest('.nav-link');
        if (link) {
            const pageId = link.getAttribute('href').substring(1);
            showPage(pageId);
             if (window.innerWidth < 768) {
                toggleMenu();
            }
        }
    }
    
    async function handleStudentFormSubmit(e) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    // GÜNCELLENDİ: Eğitmen ID ve Adını kaydeder
    async function handleCourseFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.dataset.id;
        const formData = new FormData(form);
        const courseData = Object.fromEntries(formData.entries());
        courseData.quota = parseInt(courseData.quota);
        courseData.duration = parseInt(courseData.duration) || 60;
        courseData.roomId = courseData.roomId;
        
        // YENİ: Eğitmenin hem ID'sini hem Adını al
        courseData.instructorId = form.elements.instructorId.value;
        courseData.instructorName = form.elements.instructorId.options[form.elements.instructorId.selectedIndex].text;

        loadingOverlay.classList.remove('hidden');
        let error = null;
        try {
            if (id) {
                await db.collection('courses').doc(id).update(courseData);
            } else {
                await db.collection('courses').add(courseData);
            }
        } catch (err) {
            error = err;
            console.error("Kurs kaydedilemedi: ", error);
            document.getElementById('form-error').textContent = "Hata: " + error.message;
        } finally {
            loadingOverlay.classList.add('hidden');
            if (!error) hideModal();
        }
    }
    
    async function handleRoomFormSubmit(e) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    // *** YENİ: Personel Formunu İşleme Fonksiyonu ***
    // (Aşama 1: Sadece Firestore'a kaydeder. Auth (giriş) işlemi Aşama 2'de eklenecek)
    async function handleUserFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.dataset.id;
        const formData = new FormData(form);
        const userData = Object.fromEntries(formData.entries());

        // Şifreyi (eğer varsa) Firestore'a kaydetme
        // GÜVENLİK NOTU: Bu, sadece geçici bir adımdır.
        // Normalde şifreler ASLA veritabanına bu şekilde kaydedilmez.
        // Aşama 2'de Auth'a taşıyınca bu alanı kaldıracağız.
        const password = userData.password;
        delete userData.password; // Firestore'a şifreyi yazma (Auth'a yazılacak)

        loadingOverlay.classList.remove('hidden');
        let error = null;
        try {
            if (id) { // Düzenleme
                await db.collection('users').doc(id).update(userData);
            } else { // Yeni Kayıt
                // Aşama 2'de burada Auth (createUser) da yapılacak
                // Şimdilik sadece Firestore'a veri kaydediyoruz.
                // Not: 'id' kullanmak yerine 'add' kullanmak daha iyi olurdu, ama şimdilik
                // Auth UID ile eşleşme kolaylığı için ID'yi manuel alabiliriz (veya 'add' sonrası ID'yi Auth'a atayabiliriz)
                // Şimdilik en basit yöntem:
                await db.collection('users').add(userData);
            }
        } catch (err) {
            error = err;
            console.error("Personel kaydedilemedi: ", error);
            document.getElementById('form-error').textContent = "Hata: " + error.message;
        } finally {
            loadingOverlay.classList.add('hidden');
            if (!error) hideModal();
        }
    }
    
    async function handlePaymentFormSubmit(e) {
        //... (Bu fonksiyonda değişiklik yok)
    }
    
    async function handleAttendanceUpdate(studentId, status, details = {}) {
        //... (Bu fonksiyonda değişiklik yok)
    }
    
    async function handleAttendanceDelete(studentId, attendanceIndex) {
        //... (Bu fonksiyonda değişiklik yok)
    }
    
    async function handleStudentStatusToggle(studentId) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    function sendViaWhatsApp(studentId) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    function sendViaEmail(studentId) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    // GÜNCELLENDİ: Personel (user) butonları eklendi
    async function handleTableClicks(e) {
        const target = e.target.closest('button, a');
        if (!target) return;
        
        e.preventDefault();
        const id = target.dataset.id;
        
        // --- Öğrenci Butonları ---
        if (target.classList.contains('student-name-link')) { /* ... */ }
        if (target.classList.contains('edit-student-btn')) { /* ... */ }
        if (target.classList.contains('delete-student-btn')) { /* ... */ }
        if (target.classList.contains('send-student-info-btn')) { /* ... */ }
        if (target.classList.contains('print-student-btn')) { /* ... */ }
        if (target.classList.contains('add-to-calendar-btn')) { /* ... */ }

        // --- Kurs Butonları ---
        if (target.classList.contains('edit-course-btn')) { /* ... */ }
        if (target.classList.contains('delete-course-btn')) { /* ... */ }

        // --- Oda Butonları ---
        if (target.classList.contains('edit-room-btn')) { /* ... */ }
        if (target.classList.contains('delete-room-btn')) { /* ... */ }

        // --- Ödeme Butonları ---
        if (target.classList.contains('add-payment-btn')) { /* ... */ }

        // *** YENİ: Personel (User) Butonları ***
        if (target.classList.contains('edit-user-btn')) {
            const user = state.users.find(u => u.id == id);
            if (user) showModal(getUserFormHTML(user));
        }
        if (target.classList.contains('delete-user-btn')) {
            // Personele atanmış kurs var mı kontrol et
            const coursesAssigned = state.courses.filter(c => c.instructorId === id).length;
            if (coursesAssigned > 0) {
                alert('Bu personele atanmış aktif kurslar varken silemezsiniz. Lütfen önce kurslardan bu eğitmeni kaldırın.');
                return;
            }
            if (confirm('Bu personeli kalıcı olarak silmek istediğinizden emin misiniz? (Bu işlem Firebase Auth hesabını silmez!)')) {
                loadingOverlay.classList.remove('hidden');
                await db.collection('users').doc(id).delete();
                loadingOverlay.classList.add('hidden');
            }
        }
    }
    
    function generateGoogleCalendarLink(studentId) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    function printStudentInfo(studentId) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    // --- OLAY DİNLEYİCİLERİ (EVENT LISTENERS) ---
    document.querySelector('aside nav').addEventListener('click', handleNavigation);
    document.getElementById('add-student-btn').addEventListener('click', () => showModal(getStudentFormHTML()));
    document.getElementById('add-course-btn').addEventListener('click', () => showModal(getCourseFormHTML()));
    document.getElementById('add-room-btn').addEventListener('click', () => showModal(getRoomFormHTML()));
    document.getElementById('add-user-btn').addEventListener('click', () => showModal(getUserFormHTML())); // *** YENİ ***
    
    menuBtn.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', toggleMenu);
    
    // ... (Tüm takvim butonları ve filtreler aynı, değişiklik yok) ...

    document.getElementById('prev-week-btn').addEventListener('click', () => { /* ... */ });
    document.getElementById('next-week-btn').addEventListener('click', () => { /* ... */ });
    document.getElementById('today-btn').addEventListener('click', () => { /* ... */ });
    document.getElementById('calendar-view-toggle').addEventListener('click', (e) => { /* ... */ });

    document.getElementById('student-search').addEventListener('input', renderStudentsPage);
    document.getElementById('student-course-filter').addEventListener('change', renderStudentsPage);
    document.getElementById('student-payment-filter').addEventListener('change', renderStudentsPage);
    document.getElementById('student-status-filter').addEventListener('change', renderStudentsPage);
    
    function applyPaymentFilters() { /* ... */ }

    document.getElementById('payment-student-search').addEventListener('input', applyPaymentFilters);
    document.getElementById('payment-course-filter').addEventListener('change', applyPaymentFilters);
    document.getElementById('payment-status-filter').addEventListener('change', applyPaymentFilters);

    document.getElementById('calendar-course-filter').addEventListener('change', renderCalendar);
    document.getElementById('calendar-room-filter').addEventListener('change', renderCalendar);
    document.getElementById('download-pdf-btn').addEventListener('click', handleDownloadPDF);

    document.getElementById('generate-report-btn').addEventListener('click', handleGenerateReport);
    document.getElementById('download-report-pdf-btn').addEventListener('click', handleDownloadReportPDF);


    modal.addEventListener('click', (e) => { /* ... */ });
    document.body.addEventListener('click', e => { /* ... */ });
    modalContent.addEventListener('click', e => { /* ... */ });
    
    // GÜNCELLENDİ: user-form eklendi
    modalContent.addEventListener('submit', (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        if (e.target.id === 'telafi-form') {
            //... (telafi mantığı aynı)
        } else if (e.target.id === 'student-form') {
            handleStudentFormSubmit(e);
        } else if (e.target.id === 'course-form') {
            handleCourseFormSubmit(e);
        } else if (e.target.id === 'room-form') {
            handleRoomFormSubmit(e);
        } else if (e.target.id === 'user-form') { // *** YENİ ***
            handleUserFormSubmit(e);
        } else if (e.target.id === 'payment-form') {
            handlePaymentFormSubmit(e);
        }
    });

    document.querySelector('main').addEventListener('click', handleTableClicks);
    
    // --- AUTHENTICATION ---
    authForm.addEventListener('submit', (e) => {
        //... (Bu fonksiyon Aşama 2'de güncellenecek)
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });

    auth.onAuthStateChanged(user => {
        //... (Bu fonksiyon Aşama 2'de güncellenecek)
    });

    async function handlePaymentDelete(studentId, paymentIndex) {
        //... (Bu fonksiyonda değişiklik yok)
    }

    function handleDownloadPDF() {
        //... (Bu fonksiyonda değişiklik yok)
    }

    // --- Raporlama Fonksiyonları ---
    function handlePrintReportsPage() { /* ... */ }
    function renderReportsPage() { /* ... */ }
    function handleGenerateReport() { /* ... */ }
    function renderFinancialReports(startDate, endDate) { /* ... */ }
    function renderStudentReports() { /* ... */ }

    // GÜNCELLENDİ: Eğitmen ders yükü raporu artık ID bazlı çalışıyor
    function renderOperationalReports() {
        // Course Popularity
        const popularityBody = document.getElementById('report-course-popularity-body');
        popularityBody.innerHTML = '';
        const activeStudents = state.students.filter(s => s.status === 'active');
        
        const coursePopularity = state.courses.map(course => {
            const count = activeStudents.filter(s => s.courseId === course.id).length;
            return { name: course.name, count };
        });

        coursePopularity.sort((a, b) => b.count - a.count);

        if(coursePopularity.length === 0){
            popularityBody.innerHTML = '<tr><td colspan="2" class="p-3 text-gray-500 text-center">Kayıtlı kurs bulunamadı.</td></tr>';
        } else {
            coursePopularity.forEach(c => {
                popularityBody.innerHTML += `
                    <tr class="border-b">
                        <td class="p-3">${c.name}</td>
                        <td class="p-3">${c.count}</td>
                    </tr>
                `;
            });
        }

        // Instructor Workload
        const workloadBody = document.getElementById('report-instructor-workload-body');
        workloadBody.innerHTML = '';
        const workload = {};

        activeStudents.forEach(student => {
            const course = state.courses.find(c => c.id === student.courseId);
            if (course && course.instructorId) { // Sadece atanmış bir eğitmen varsa
                // Eğitmenin adını state.users'dan al
                const instructor = state.users.find(u => u.id === course.instructorId);
                const instructorName = instructor ? instructor.name : (course.instructorName || 'Bilinmeyen');
                
                if (!workload[instructorName]) {
                    workload[instructorName] = 0;
                }
                workload[instructorName]++;
            }
        });

        const sortedWorkload = Object.entries(workload).sort(([,a],[,b]) => b-a);
        
        if(sortedWorkload.length === 0) {
             workloadBody.innerHTML = '<tr><td colspan="2" class="p-3 text-gray-500 text-center">Eğitmen kaydı bulunamadı.</td></tr>';
        } else {
            sortedWorkload.forEach(([instructor, count]) => {
                workloadBody.innerHTML += `
                    <tr class="border-b">
                        <td class="p-3">${instructor}</td>
                        <td class="p-3">${count}</td>
                    </tr>
                `;
            });
        }
    }

    function handleDownloadReportPDF() {
        //... (Bu fonksiyonda değişiklik yok)
    }

});
