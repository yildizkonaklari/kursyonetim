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
            case 'how-to-use': break;
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
    
    // GÜNCELLENDİ: renderStudentsPage (Artık odayı kurstan alıyor)
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
            // Odayı artık öğrenci üzerinden değil, kurs üzerinden bul
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

    // GÜNCELLENDİ: renderCoursesPage (Oda adını gösterir)
    function renderCoursesPage() {
        const tableBody = document.getElementById('courses-table-body');
        tableBody.innerHTML = '';
        state.courses.forEach(course => {
            const studentCount = state.students.filter(s => s.courseId === course.id && s.status === 'active').length;
            const room = state.rooms.find(r => r.id === course.roomId); // Odayı bul
            
            const row = `
                <tr class="border-b">
                    <td class="p-4 font-medium">${course.name}</td>
                    <td class="p-4">${course.instructor}</td>
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
    
    // GÜNCELLENDİ: renderCourseCalendarGrid (Odayı kurstan alıyor)
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
    
    // GÜNCELLENDİ: renderRoomCalendarGrids (Odayı kurstan alıyor)
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
                    
                    // Öğrencileri bul, ama odayı kurstan kontrol et
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
    
    // GÜNCELLENDİ: getStudentFormHTML (Oda seçimi kaldırıldı)
    function getStudentFormHTML(student = {}) {
        const isEditing = !!student.id;
        const title = isEditing ? 'Öğrenci Bilgilerini Düzenle' : 'Yeni Öğrenci Ekle';
        
        // Kurs seçeneklerini ve hangi odaya bağlı olduklarını göster
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
                        <input type="tel" name="phone" placeholder="Telefon" value="${student.phone || ''}" class="p-2 border rounded">
                        <input type="email" name="email" placeholder="E-posta" value="${student.email || ''}" class="p-2 border rounded">
                         <input type="tel" name="parentPhone" placeholder="Veli Telefon" value="${student.parentPhone || ''}" class="p-2 border rounded">
                        <input type="email" name="parentEmail" placeholder="Veli E-posta" value="${student.parentEmail || ''}" class="p-2 border rounded">
                        
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
                    <p id="form-error" class="text-red-600 text-sm mt-2 text-center h-4"></p>
                </form>
            </div>
            <div class="flex justify-end mt-6 gap-4">
                <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
                <button type="submit" form="student-form" class="bg-indigo-600 text-white px-4 py-2 rounded">${isEditing ? 'Güncelle' : 'Kaydet'}</button>
            </div>
        `;
    }
    
    // GÜNCELLENDİ: getCourseFormHTML (Oda seçimi eklendi)
    function getCourseFormHTML(course = {}) {
        const isEditing = !!course.id;
        const title = isEditing ? 'Kurs Bilgilerini Düzenle' : 'Yeni Kurs Ekle';
        
        // Oda seçeneklerini oluştur
        let roomOptions = state.rooms.map(r => `<option value="${r.id}" ${course.roomId == r.id ? 'selected' : ''}>${r.name} (Kapasite: ${r.capacity})</option>`).join('');

        return `
             <h2 class="text-2xl font-bold mb-6">${title}</h2>
             <form id="course-form" data-id="${course.id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" placeholder="Kurs Adı" value="${course.name || ''}" required class="p-2 border rounded">
                    <input type="text" name="instructor" placeholder="Eğitmen Adı" value="${course.instructor || ''}" required class="p-2 border rounded">
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
                <div class="flex justify-end mt-6 gap-4">
                    <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
                    <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">${isEditing ? 'Güncelle' : 'Kaydet'}</button>
                </div>
             </form>
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
                <div class="flex justify-end mt-6 gap-4">
                    <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">${isEditing ? 'Güncelle' : 'Kaydet'}</button>
                </div>
             </form>
        `;
    }
    
    function getPaymentFormHTML(student) {
        const course = state.courses.find(c => c.id === student.courseId);
        const balance = (student.payments || []).reduce((sum, p) => sum + p.amount, 0);
        
        let paymentHistory = (student.payments || []).map((p, index) => {
            const typeText = p.type === 'initial' ? 'İlk Kayıt' : p.type === 'renewal' ? 'Dönem Yenileme' : 'Ödeme';
            const amountClass = p.amount > 0 ? 'text-green-600' : 'text-red-600';
            return `<li class="flex justify-between items-center py-1 border-b">
                        <span>${new Date(p.date).toLocaleDateString('tr-TR')} - ${typeText}</span>
                        <span class="font-semibold ${amountClass}">${p.amount.toFixed(2)} ₺
                            <button class="delete-payment-btn text-red-500 hover:text-red-700 p-1 ml-2" data-student-id="${student.id}" data-payment-index="${index}" title="Bu ödemeyi sil">
                                <i class="fas fa-trash-alt fa-xs"></i>
                            </button>
                        </span>
                    </li>`;
        }).join('');

        return `
            <div>
                <h2 class="text-2xl font-bold mb-2">Ödeme İşlemleri</h2>
                <p class="mb-4 text-gray-700">${student.firstName} ${student.lastName} - ${course ? course.name : ''}</p>
            </div>
            <div>
                <div class="bg-gray-100 p-4 rounded-lg mb-4">
                    <div class="flex justify-between"><span>Güncel Bakiye:</span> <strong class="${balance < 0 ? 'text-red-600' : 'text-green-600'}">${balance.toFixed(2)} ₺</strong></div>
                </div>
                
                <h3 class="font-bold mb-2 mt-6">İşlem Geçmişi</h3>
                <ul class="mb-6">${paymentHistory}</ul>

                <form id="payment-form" data-id="${student.id}">
                    <div class="flex items-end gap-4">
                        <div class="flex-grow">
                             <label for="payment-amount" class="block text-sm font-medium text-gray-700">Ödeme Tutarı</label>
                             <input type="number" id="payment-amount" name="amount" placeholder="0.00" step="0.01" required class="mt-1 w-full p-2 border rounded">
                        </div>
                        <button type="submit" class="bg-yellow-500 text-white px-4 py-2 rounded h-fit">Ekle</button>
                    </div>
                     <div id="payment-feedback" class="text-center font-medium mt-2 h-5"></div>
                </form>
            </div>
            <div class="text-right mt-6">
                <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">Kapat</button>
            </div>
        `;
    }
    
    function getStudentStatusModalHTML(student) {
        const balance = (student.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const sessionCount = (student.attendance || []).filter(a => a.status === 'geldi' || a.status === 'gelmedi').length;
        const status = student.status === 'active';

        let attendanceHistory = (student.attendance || []).map((a, index) => {
            let statusText = '';
            if (a.status === 'geldi') {
                statusText = 'Geldi';
            } else if (a.status === 'gelmedi') {
                statusText = 'Gelmedi';
            } else if (a.status === 'telafi') {
                statusText = `Telafi -> ${new Date(a.date).toLocaleDateString('tr-TR')} ${a.time}`;
            }
            const originalDate = a.originalDate ? new Date(a.originalDate).toLocaleDateString('tr-TR') : new Date(a.date).toLocaleDateString('tr-TR');
            return `<li class="flex justify-between items-center py-1 border-b text-sm">
                        <span>${originalDate}: ${statusText}</span>
                        <button class="delete-attendance-btn text-red-500 hover:text-red-700 p-1" data-student-id="${student.id}" data-attendance-index="${index}" title="Bu kaydı sil">
                            <i class="fas fa-trash-alt fa-xs"></i>
                        </button>
                    </li>`;
        }).join('') || '<p class="text-gray-500 text-sm">Devam kaydı bulunmuyor.</p>';

        return `
             <div>
                <div class="flex justify-between items-start mb-2">
                    <h2 class="text-2xl font-bold">${student.firstName} ${student.lastName}</h2>
                    <div class="flex items-center gap-2 cursor-pointer" id="toggle-student-status-btn" data-id="${student.id}">
                        <span class="text-sm font-medium ${status ? 'text-green-600' : 'text-red-600'}">${status ? 'Aktif' : 'Pasif'}</span>
                        <div class="relative">
                            <div class="w-10 h-6 rounded-full shadow-inner ${status ? 'bg-green-500' : 'bg-gray-300'}"></div>
                            <div class="absolute w-4 h-4 bg-white rounded-full shadow inset-y-0 left-0 my-1 ml-1 transition-transform duration-200 ease-in-out ${status ? 'transform translate-x-4' : ''}"></div>
                        </div>
                    </div>
                </div>
                <p class="mb-4 text-gray-700">Dönemdeki Ders: ${sessionCount % student.lessonsPerFee} / ${student.lessonsPerFee}</p>
            </div>

            <div>
                <div class="bg-gray-100 p-4 rounded-lg mb-4 flex justify-between">
                    <span>Güncel Bakiye:</span> <strong class="${balance < 0 ? 'text-red-600' : 'text-green-600'}">${balance.toFixed(2)} ₺</strong>
                </div>

                <div class="mb-6">
                    <h3 class="font-bold mb-2">Bugünkü Dersi İşle</h3>
                    <div id="attendance-buttons" class="flex gap-4">
                        <button id="record-attendance-geldi" data-id="${student.id}" class="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600">Geldi</button>
                        <button id="record-attendance-gelmedi" data-id="${student.id}" class="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600">Gelmedi</button>
                        <button id="record-attendance-telafi-btn" data-id="${student.id}" class="flex-1 bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600">Telafi</button>
                    </div>
                    <div id="attendance-feedback" class="text-center font-medium mt-2 h-5"></div>
                    <p class="text-xs text-gray-500 mt-2 text-center">Uyarı: Öğrencinin telafi olan dersini gelmedi olarak işaretlemeyiniz. Mazeretsiz gelmeyenler için 'Gelmedi' olarak işleyiniz.</p>
                </div>

                <form id="telafi-form" class="hidden mt-4 bg-gray-50 p-4 rounded">
                     <h4 class="font-semibold mb-2">Telafi Dersi Planla</h4>
                     <div class="flex flex-col sm:flex-row gap-4">
                         <input type="date" name="telafiDate" required class="p-2 border rounded w-full">
                         <input type="time" name="telafiTime" required class="p-2 border rounded w-full">
                     </div>
                     <p id="telafi-form-error" class="text-red-600 text-sm mt-2 text-center h-4"></p>
                     <button type="submit" data-id="${student.id}" class="w-full mt-2 bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Telafiyi Kaydet</button>
                </form>

                <h3 class="font-bold mb-2 mt-6">Devam Geçmişi</h3>
                <ul>${attendanceHistory}</ul>
            </div>
            
            <div class="text-right mt-6">
                <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">Kapat</button>
            </div>
        `;
    }

    function getSendInfoModalHTML(student) {
        return `
            <h2 class="text-2xl font-bold mb-4">"${student.firstName} ${student.lastName}" için Bilgi Gönder</h2>
            <p class="text-gray-600 mb-6">Öğrenci bilgilerini WhatsApp veya E-posta ile göndermek için bir yöntem seçin.</p>
            <p id="send-error" class="text-red-500 text-sm text-center h-4 mb-4"></p>
            <div class="flex flex-col sm:flex-row gap-4">
                <button id="send-whatsapp-btn" data-id="${student.id}" class="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2">
                    <i class="fab fa-whatsapp fa-lg"></i> WhatsApp ile Gönder
                </button>
                <button id="send-email-btn" data-id="${student.id}" class="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2">
                    <i class="fas fa-envelope fa-lg"></i> E-posta ile Gönder
                </button>
            </div>
            <div class="text-right mt-8">
                <button type="button" id="cancel-modal-btn" class="bg-gray-300 px-4 py-2 rounded">Kapat</button>
            </div>
        `;
    }

    function generateStudentInfoText(studentId) {
        const student = state.students.find(s => s.id == studentId);
        const course = state.courses.find(c => c.id === student.courseId);
        if (!student || !course) return "Öğrenci bilgileri bulunamadı.";

        const balance = (student.payments || []).reduce((sum, p) => sum + p.amount, 0);

        let message = `*Alegori Sanat Evi Bilgilendirme*\n\n`;
        message += `*Öğrenci Bilgileri*\n`;
        message += `Adı Soyadı: ${student.firstName} ${student.lastName}\n`;
        message += `Kurs: ${course.name}\n`;
        message += `Ders Programı: ${student.day} günleri, saat ${student.time}\n\n`;

        message += `*Devam Geçmişi*\n`;
        if (student.attendance && student.attendance.length > 0) {
            student.attendance.forEach(a => {
                const originalDate = new Date(a.originalDate || a.date).toLocaleDateString('tr-TR');
                let statusText = '';
                if (a.status === 'geldi') statusText = 'Geldi';
                else if (a.status === 'gelmedi') statusText = 'Gelmedi';
                else if (a.status === 'telafi') statusText = `Telafi -> ${new Date(a.date).toLocaleDateString('tr-TR')} ${a.time}`;
                message += `- ${originalDate}: ${statusText}\n`;
            });
        } else {
            message += `Devam kaydı bulunmuyor.\n`;
        }
        message += `\n`;

        message += `*Ödeme Geçmişi ve Bakiye*\n`;
        if (student.payments && student.payments.length > 0) {
            student.payments.forEach(p => {
                const date = new Date(p.date).toLocaleDateString('tr-TR');
                const type = p.type === 'initial' ? 'İlk Kayıt' : p.type === 'renewal' ? 'Dönem Yenileme' : 'Ödeme';
                const amount = p.amount.toFixed(2);
                message += `- ${date}: ${type} (${amount} ₺)\n`;
            });
        } else {
            message += `Ödeme kaydı bulunmuyor.\n`;
        }
        message += `\n*Güncel Bakiye: ${balance.toFixed(2)} ₺*\n`;
        
        return message;
    }

    // GÜNCELLENDİ: generateStudentInfoHTML (Odayı kurstan alıyor)
    function generateStudentInfoHTML(studentId) {
        const student = state.students.find(s => s.id == studentId);
        const course = state.courses.find(c => c.id === student.courseId);
        const room = course ? state.rooms.find(r => r.id === course.roomId) : null;
        if (!student || !course) return "<p>Öğrenci bilgileri bulunamadı.</p>";

        const balance = (student.payments || []).reduce((sum, p) => sum + p.amount, 0);

        let attendanceHtml = (student.attendance && student.attendance.length > 0)
            ? student.attendance.map(a => {
                const originalDate = new Date(a.originalDate || a.date).toLocaleDateString('tr-TR');
                let statusText = '';
                if (a.status === 'geldi') statusText = 'Geldi';
                else if (a.status === 'gelmedi') statusText = 'Gelmedi';
                else if (a.status === 'telafi') statusText = `Telafi -> ${new Date(a.date).toLocaleDateString('tr-TR')} ${a.time}`;
                return `<tr><td style="padding: 4px;">${originalDate}</td><td style="padding: 4px;">${statusText}</td></tr>`;
            }).join('')
            : '<tr><td colspan="2" style="padding: 4px; color: #888;">Devam kaydı bulunmuyor.</td></tr>';
        
        let paymentsHtml = (student.payments && student.payments.length > 0)
            ? student.payments.map(p => {
                const date = new Date(p.date).toLocaleDateString('tr-TR');
                const type = p.type === 'initial' ? 'İlk Kayıt' : p.type === 'renewal' ? 'Dönem Yenileme' : 'Ödeme';
                const amount = p.amount.toFixed(2);
                const color = p.amount > 0 ? 'green' : 'red';
                return `<tr><td style="padding: 4px;">${date}</td><td style="padding: 4px;">${type}</td><td style="padding: 4px; color: ${color}; text-align: right;">${amount} ₺</td></tr>`;
            }).join('')
            : '<tr><td colspan="3" style="padding: 4px; color: #888;">Ödeme kaydı bulunmuyor.</td></tr>';

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; width: 210mm; min-height: 297mm; margin: auto;">
                <header style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
                    <h1>Alegori Sanat Evi</h1>
                    <p>Öğrenci Bilgi Fişi</p>
                </header>
                
                <section style="margin-bottom: 20px;">
                    <h2 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px;">Öğrenci Bilgileri</h2>
                    <p><strong>Adı Soyadı:</strong> ${student.firstName} ${student.lastName}</p>
                    <p><strong>Kurs:</strong> ${course.name}</p>
                    <p><strong>Ders Programı:</strong> ${student.day} günleri, saat ${student.time}</p>
                    <p><strong>Oda:</strong> ${room ? room.name : 'Belirtilmemiş'}</p>
                </section>
                
                <section style="margin-bottom: 20px;">
                    <h2 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px;">Devam Geçmişi</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 4px; border-bottom: 1px solid #ddd;">Tarih</th>
                                <th style="text-align: left; padding: 4px; border-bottom: 1px solid #ddd;">Durum</th>
                            </tr>
                        </thead>
                        <tbody>${attendanceHtml}</tbody>
                    </table>
                </section>
                
                <section>
                    <h2 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px;">Ödeme Geçmişi ve Bakiye</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 4px; border-bottom: 1px solid #ddd;">Tarih</th>
                                <th style="text-align: left; padding: 4px; border-bottom: 1px solid #ddd;">İşlem</th>
                                <th style="text-align: right; padding: 4px; border-bottom: 1px solid #ddd;">Tutar</th>
                            </tr>
                        </thead>
                        <tbody>${paymentsHtml}</tbody>
                    </table>
                    <div style="text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 10px; border-top: 2px solid #333;">
                        Güncel Bakiye: <span style="color: ${balance < 0 ? 'red' : 'green'};">${balance.toFixed(2)} ₺</span>
                    </div>
                </section>
            </div>
        `;
        return html;
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
    
    // GÜNCELLENDİ: handleStudentFormSubmit (Çakışma mantığı değişti)
    async function handleStudentFormSubmit(e) {
        e.preventDefault();
        const form = e.target.closest('form');
        const id = form.dataset.id;
        const formData = new FormData(form);
        const studentData = Object.fromEntries(formData.entries());
        
        // Formdan artık roomId gelmiyor. Diğer verileri al.
        studentData.courseId = studentData.courseId;
        studentData.fee = parseFloat(studentData.fee);
        studentData.lessonsPerFee = parseInt(studentData.lessonsPerFee);

        // Seçilen kursun bilgilerini al (oda ve kontenjan)
        const course = state.courses.find(c => c.id === studentData.courseId);
        if (!course) {
             document.getElementById('form-error').textContent = `Geçerli bir kurs seçilmedi!`;
             return;
        }
        
        const activeStudents = state.students.filter(s => s.status === 'active');
        
        // YENİ MANTIK: KURS KONTENJANI KONTROLÜ (GERİ GELDİ)
        // Bu kursa (örn: Piyano-A), bu saatte kaç kişi kayıtlı?
        const studentsInCourseAtTime = activeStudents.filter(s => 
            s.id != id && 
            s.courseId === studentData.courseId && // Birebir aynı kurs
            s.day === studentData.day && 
            s.time === studentData.time
        );

        if (course.quota && studentsInCourseAtTime.length >= course.quota) {
            document.getElementById('form-error').textContent = `Bu kursun bu saatteki kontenjanı dolu! (Kontenjan: ${course.quota})`;
            return;
        }
        
        // İKİNCİL KONTROL: ODA ÇAKIŞMASI (Hala önemli)
        // Bu öğrenciyi atayacağımız oda (course.roomId)
        // o saatte, başka bir kurstan (örn: Keman-A) dolayı dolu mu?
        const room = state.rooms.find(r => r.id === course.roomId);
        if (room) {
            // O odada, o saatte olan TÜM öğrencileri bul (kurs fark etmeksizin)
            const studentsInRoomAtTime = activeStudents.filter(s => {
                if (s.id == id) return false; // kendisi değil
                const studentCourse = state.courses.find(c => c.id === s.courseId);
                return studentCourse &&
                       studentCourse.roomId === course.roomId && // Aynı odada
                       s.day === studentData.day && // Aynı gün
                       s.time === studentData.time; // Aynı saat
            });

            if (room.capacity && studentsInRoomAtTime.length >= room.capacity) {
                 document.getElementById('form-error').textContent = `Bu oda (${room.name}) seçtiğiniz saatte başka bir dersten dolayı dolu! (Kapasite: ${room.capacity})`;
                 return;
            }
        }
        
        loadingOverlay.classList.remove('hidden');
        try {
            if (id) { 
                // Güncellemede sadece studentData'yı yolla (roomId ZATEN YOK)
                await db.collection('students').doc(id).update(studentData);
            } else { 
                // Yeni kayıtta da studentData'yı yolla
                studentData.payments = [{ amount: -studentData.fee, date: new Date().toISOString(), type: 'initial'}];
                studentData.attendance = [];
                studentData.status = 'active';
                await db.collection('students').add(studentData);
            }
        } catch (error) {
            console.error("Öğrenci kaydedilemedi: ", error);
        } finally {
            loadingOverlay.classList.add('hidden');
            hideModal();
        }
    }

    // GÜNCELLENDİ: handleCourseFormSubmit (roomId eklendi)
    async function handleCourseFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.dataset.id;
        const formData = new FormData(form);
        const courseData = Object.fromEntries(formData.entries());
        courseData.quota = parseInt(courseData.quota);
        courseData.duration = parseInt(courseData.duration) || 60;
        courseData.roomId = courseData.roomId; // YENİ

        loadingOverlay.classList.remove('hidden');
        try {
            if (id) {
                await db.collection('courses').doc(id).update(courseData);
            } else {
                await db.collection('courses').add(courseData);
            }
        } catch (error) {
            console.error("Kurs kaydedilemedi: ", error);
        } finally {
            loadingOverlay.classList.add('hidden');
            hideModal();
        }
    }
    
    async function handleRoomFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.dataset.id;
        const formData = new FormData(form);
        const roomData = Object.fromEntries(formData.entries());
        roomData.capacity = parseInt(roomData.capacity);

        loadingOverlay.classList.remove('hidden');
        try {
            if (id) {
                await db.collection('rooms').doc(id).update(roomData);
            } else {
                await db.collection('rooms').add(roomData);
            }
        } catch (error) {
            console.error("Oda kaydedilemedi: ", error);
        } finally {
            loadingOverlay.classList.add('hidden');
            hideModal();
        }
    }
    
    async function handlePaymentFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const studentId = form.dataset.id;
        const amount = parseFloat(form.elements.amount.value);
        const student = state.students.find(s => s.id == studentId);

        if (amount > 0 && student) {
            const feedbackEl = document.getElementById('payment-feedback');
            form.querySelector('button[type="submit"]').disabled = true;

            loadingOverlay.classList.remove('hidden');
            const newPayment = { amount, date: new Date().toISOString(), type: 'payment' };
            const updatedPayments = [...(student.payments || []), newPayment];
            try {
                await db.collection('students').doc(studentId).update({ payments: updatedPayments });
                const updatedStudent = { ...student, payments: updatedPayments };
                showModal(getPaymentFormHTML(updatedStudent));
                
                const newFeedbackEl = document.getElementById('payment-feedback');
                if (newFeedbackEl) {
                    newFeedbackEl.textContent = `${student.firstName} ${student.lastName} - ${amount.toFixed(2)} ₺ ödeme eklendi.`;
                    newFeedbackEl.classList.add('text-green-600');
                }
            } catch(error) {
                console.error("Ödeme eklenemedi:", error);
                 if (feedbackEl) {
                    feedbackEl.textContent = 'Bir hata oluştu!';
                    feedbackEl.classList.add('text-red-600');
                 }
                 form.querySelector('button[type="submit"]').disabled = false;
            } finally {
                loadingOverlay.classList.add('hidden');
            }
        }
    }
    
    async function handleAttendanceUpdate(studentId, status, details = {}) {
        const student = state.students.find(s => s.id == studentId);
        if (!student) return;

        const attendanceButtons = document.getElementById('attendance-buttons');
        const feedbackEl = document.getElementById('attendance-feedback');

        if ((status === 'geldi' || status === 'gelmedi') && attendanceButtons) {
            Array.from(attendanceButtons.children).forEach(btn => btn.disabled = true);
        }

        loadingOverlay.classList.remove('hidden');
        const newAttendance = [...(student.attendance || [])];
        let newPayments = [...(student.payments || [])];
        
        if (status === 'geldi' || status === 'gelmedi') {
            newAttendance.push({ date: new Date().toISOString(), status });

            const sessionCount = newAttendance.filter(a => a.status === 'geldi' || a.status === 'gelmedi').length;
            if (sessionCount > 0 && student.lessonsPerFee > 0 && sessionCount % student.lessonsPerFee === 0) {
                newPayments.push({ amount: -student.fee, date: new Date().toISOString(), type: 'renewal' });
            }
        } else if (status === 'telafi') {
            const { day, time, date } = details;
            newAttendance.push({ 
                studentId,
                status: 'telafi', 
                originalDate: new Date().toISOString(),
                date: date,
                day,
                time
            });
        }
        
        try {
            await db.collection('students').doc(studentId).update({
                attendance: newAttendance,
                payments: newPayments
            });

            const updatedStudent = { ...student, attendance: newAttendance, payments: newPayments };
            showModal(getStudentStatusModalHTML(updatedStudent));

            if (status === 'geldi' || status === 'gelmedi') {
                const newFeedbackEl = document.getElementById('attendance-feedback');
                if (newFeedbackEl) {
                    let statusText = status === 'geldi' ? 'Geldi' : 'Gelmedi';
                    newFeedbackEl.textContent = `${student.firstName} - ${statusText} olarak kaydedildi.`;
                    newFeedbackEl.classList.add('text-green-600');
                    newFeedbackEl.classList.remove('text-red-600');
                }
            } else {
                hideModal();
            }
        } catch (error) {
            console.error("Devam durumu güncellenemedi: ", error);
            if (attendanceButtons) {
                Array.from(attendanceButtons.children).forEach(btn => btn.disabled = false);
            }
             if (feedbackEl) {
                feedbackEl.textContent = 'Bir hata oluştu!';
                feedbackEl.classList.remove('text-green-600');
                feedbackEl.classList.add('text-red-600');
            }
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    async function handleAttendanceDelete(studentId, attendanceIndex) {
        const student = state.students.find(s => s.id == studentId);
        if (!student) return;

        const attendanceToDelete = (student.attendance || [])[attendanceIndex];
        if (!attendanceToDelete) return;

        const wasChargeable = attendanceToDelete.status === 'geldi' || attendanceToDelete.status === 'gelmedi';
        const sessionCountBeforeDelete = (student.attendance || []).filter(a => a.status === 'geldi' || a.status === 'gelmedi').length;

        const newAttendance = [...(student.attendance || [])];
        newAttendance.splice(attendanceIndex, 1);
        
        let newPayments = [...(student.payments || [])];

        if (wasChargeable && sessionCountBeforeDelete > 0 && student.lessonsPerFee > 0 && sessionCountBeforeDelete % student.lessonsPerFee === 0) {
            const lastRenewalIndex = newPayments.map(p => p.type).lastIndexOf('renewal');
            if (lastRenewalIndex > -1) {
                newPayments.splice(lastRenewalIndex, 1);
            }
        }

        loadingOverlay.classList.remove('hidden');
        try {
            await db.collection('students').doc(studentId).update({
                attendance: newAttendance,
                payments: newPayments
            });
            const updatedStudent = { ...student, attendance: newAttendance, payments: newPayments };
            showModal(getStudentStatusModalHTML(updatedStudent));
        } catch (error) {
            console.error("Devam kaydı silinemedi: ", error);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    async function handleStudentStatusToggle(studentId) {
        const student = state.students.find(s => s.id == studentId);
        if (student) {
            const newStatus = student.status === 'active' ? 'inactive' : 'active';
            loadingOverlay.classList.remove('hidden');
            try {
                await db.collection('students').doc(studentId).update({ status: newStatus });
            } catch (error) {
                 console.error("Öğrenci durumu güncellenemedi: ", error);
            } finally {
                loadingOverlay.classList.add('hidden');
                hideModal();
            }
        }
    }

    function sendViaWhatsApp(studentId) {
        const student = state.students.find(s => s.id == studentId);
        if (!student || !student.phone) {
            document.getElementById('send-error').textContent = 'Öğrencinin telefon numarası kayıtlı değil.';
            return;
          // 1. Telefondaki tüm harf, boşluk, parantez vb. temizle
    let internationalPhone = student.phone.replace(/\D/g, ''); 

    // 2. Numara "0" ile başlıyorsa (0532...) başındaki 0'ı at
    if (internationalPhone.startsWith('0')) {
        internationalPhone = internationalPhone.substring(1); 
    }

    // 3. Numaranın başında 90 yoksa ekle (Türkiye ülke kodu)
    if (!internationalPhone.startsWith('90')) {
        internationalPhone = '90' + internationalPhone;
    }
        }
        const message = generateStudentInfoText(studentId);
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${student.phone}?text=${encodedMessage}`, '_blank');
        hideModal();
    }

    function sendViaEmail(studentId) {
        const student = state.students.find(s => s.id == studentId);
        if (!student || !student.email) {
            document.getElementById('send-error').textContent = 'Öğrencinin e-posta adresi kayıtlı değil.';
            return;
        }
        const message = generateStudentInfoText(studentId);
        const subject = encodeURIComponent('Alegori Sanat Evi - Öğrenci Bilgilendirmesi');
        const body = encodeURIComponent(message);
        window.location.href = `mailto:${student.email}?subject=${subject}&body=${body}`;
        hideModal();
    }

    async function handleTableClicks(e) {
        const target = e.target.closest('button, a');
        if (!target) return;
        
        e.preventDefault();
        const id = target.dataset.id;
        
        if (target.classList.contains('student-name-link')) {
            const student = state.students.find(s => s.id == id);
            if (student) showModal(getStudentStatusModalHTML(student));
        }
        if (target.classList.contains('edit-student-btn')) {
            const student = state.students.find(s => s.id == id);
            if (student) showModal(getStudentFormHTML(student));
        }
        if (target.classList.contains('delete-student-btn')) {
            if (confirm('Bu öğrenciyi kalıcı olarak silmek istediğinizden emin misiniz?')) {
                loadingOverlay.classList.remove('hidden');
                await db.collection('students').doc(id).delete();
                loadingOverlay.classList.add('hidden');
            }
        }
        if (target.classList.contains('send-student-info-btn')) {
            const student = state.students.find(s => s.id == id);
            if (student) showModal(getSendInfoModalHTML(student));
        }
        if (target.classList.contains('print-student-btn')) {
            printStudentInfo(id);
        }
         if (target.classList.contains('add-to-calendar-btn')) {
            generateGoogleCalendarLink(id);
        }
        if (target.classList.contains('edit-course-btn')) {
            const course = state.courses.find(c => c.id == id);
            if (course) showModal(getCourseFormHTML(course));
        }
        if (target.classList.contains('delete-course-btn')) {
            if (confirm('Bu kursu silmek, kayıtlı TÜM öğrencileri de silecektir. Emin misiniz?')) {
                loadingOverlay.classList.remove('hidden');
                const studentDocs = await db.collection('students').where('courseId', '==', id).get();
                const batch = db.batch();
                studentDocs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                await db.collection('courses').doc(id).delete();
                loadingOverlay.classList.add('hidden');
            }
        }
        if (target.classList.contains('edit-room-btn')) {
            const room = state.rooms.find(r => r.id == id);
            if (room) showModal(getRoomFormHTML(room));
        }
        if (target.classList.contains('delete-room-btn')) {
            // Odayı silmeden önce kullanan kurs var mı kontrol et
            const coursesInRoom = state.courses.filter(c => c.roomId === id).length;
            if (coursesInRoom > 0) {
                alert('Bu odaya atanmış kurslar varken odayı silemezsiniz. Lütfen önce kursların odasını değiştirin.');
                return;
            }
            if (confirm('Bu odayı kalıcı olarak silmek istediğinizden emin misiniz?')) {
                loadingOverlay.classList.remove('hidden');
                await db.collection('rooms').doc(id).delete();
                loadingOverlay.classList.add('hidden');
            }
        }
        if (target.classList.contains('add-payment-btn')) {
            const student = state.students.find(s => s.id == id);
            if (student) showModal(getPaymentFormHTML(student));
        }
    }
    
    function generateGoogleCalendarLink(studentId) {
        const student = state.students.find(s => s.id == studentId);
        const course = state.courses.find(c => c.id === student.courseId);
        if (!student || !course) {
            alert('Öğrenci veya kurs bilgileri bulunamadı.');
            return;
        }

        const dayMap = { 'Pazar': 0, 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6 };
        const lessonDayIndex = dayMap[student.day];

        const now = new Date();
        const currentDayIndex = now.getDay();
        let daysUntilNextLesson = lessonDayIndex - currentDayIndex;
        if (daysUntilNextLesson < 0) {
            daysUntilNextLesson += 7;
        }

        const nextLessonDate = new Date(now);
        nextLessonDate.setDate(now.getDate() + daysUntilNextLesson);
        
        const [hours, minutes] = student.time.split(':');
        nextLessonDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const startTime = nextLessonDate;
        const lessonDuration = course.duration || 60;
        const endTime = new Date(startTime.getTime() + lessonDuration * 60 * 1000);

        const toGoogleFormat = (date) => {
            const pad = (num) => (num < 10 ? '0' : '') + num;
            return date.getFullYear() +
                   pad(date.getMonth() + 1) +
                   pad(date.getDate()) +
                   'T' +
                   pad(date.getHours()) +
                   pad(date.getMinutes()) +
                   '00';
        };
        
        const startDateGoogle = toGoogleFormat(startTime);
        const endDateGoogle = toGoogleFormat(endTime);

        const title = encodeURIComponent(`${course.name} Dersi - ${student.firstName} ${student.lastName}`);
        const details = encodeURIComponent("Alegori Sanat Evi'nde ders.");
        const location = encodeURIComponent("Alegori Sanat Evi");
        const guest = student.parentEmail ? encodeURIComponent(student.parentEmail) : '';
        
        const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateGoogle}/${endDateGoogle}&details=${details}&location=${location}&add=${guest}&recur=RRULE:FREQ%3DWEEKLY&ctz=${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
        
        window.open(url, '_blank');
    }

    function printStudentInfo(studentId) {
        const printContent = generateStudentInfoHTML(studentId);
        const printArea = document.getElementById('print-area');
        printArea.innerHTML = printContent;
        printArea.classList.remove('hidden');
        window.print();
        printArea.classList.add('hidden');
        printArea.innerHTML = '';
    }

    // --- OLAY DİNLEYİCİLERİ (EVENT LISTENERS) ---
    document.querySelector('aside nav').addEventListener('click', handleNavigation);
    document.getElementById('add-student-btn').addEventListener('click', () => showModal(getStudentFormHTML()));
    document.getElementById('add-course-btn').addEventListener('click', () => showModal(getCourseFormHTML()));
    document.getElementById('add-room-btn').addEventListener('click', () => showModal(getRoomFormHTML()));
    
    menuBtn.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', toggleMenu);
    
    document.getElementById('prev-week-btn').addEventListener('click', () => {
        viewDate.setDate(viewDate.getDate() - 7);
        renderCalendar();
    });
    document.getElementById('next-week-btn').addEventListener('click', () => {
        viewDate.setDate(viewDate.getDate() + 7);
        renderCalendar();
    });
    document.getElementById('today-btn').addEventListener('click', () => {
        viewDate = new Date();
        renderCalendar();
    });

    document.getElementById('calendar-view-toggle').addEventListener('click', (e) => {
        const btn = e.target;
        const currentView = btn.dataset.view;
        
        if (currentView === 'course') {
            btn.dataset.view = 'room';
            btn.textContent = 'Kurs Bazlı Göster';
            btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            btn.classList.add('bg-green-600', 'hover:bg-green-700');
        } else {
            btn.dataset.view = 'course';
            btn.textContent = 'Oda Bazlı Göster';
            btn.classList.remove('bg-green-600', 'hover:bg-green-700');
            btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }
        
        renderCalendar();
    });

    document.getElementById('student-search').addEventListener('input', renderStudentsPage);
    document.getElementById('student-course-filter').addEventListener('change', renderStudentsPage);
    document.getElementById('student-payment-filter').addEventListener('change', renderStudentsPage);
    document.getElementById('student-status-filter').addEventListener('change', renderStudentsPage);
    
    function applyPaymentFilters() {
        const filters = {
            name: document.getElementById('payment-student-search').value,
            courseId: document.getElementById('payment-course-filter').value,
            paymentStatus: document.getElementById('payment-status-filter').value
        };
        renderPaymentsPage(filters);
    }

    document.getElementById('payment-student-search').addEventListener('input', applyPaymentFilters);
    document.getElementById('payment-course-filter').addEventListener('change', applyPaymentFilters);
    document.getElementById('payment-status-filter').addEventListener('change', applyPaymentFilters);

    document.getElementById('calendar-course-filter').addEventListener('change', renderCalendar);
    document.getElementById('calendar-room-filter').addEventListener('change', renderCalendar);
    document.getElementById('download-pdf-btn').addEventListener('click', handleDownloadPDF);

    document.getElementById('generate-report-btn').addEventListener('click', handleGenerateReport);
    document.getElementById('download-report-pdf-btn').addEventListener('click', handleDownloadReportPDF);


    modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop') || e.target.id === 'modal') {
            hideModal();
        }
    });
    
    document.body.addEventListener('click', e => {
        if (e.target.closest('.calendar-event')) {
            e.preventDefault();
            const studentId = e.target.closest('.calendar-event').dataset.studentId;
            const student = state.students.find(s => s.id == studentId);
            if (student) {
                showModal(getStudentStatusModalHTML(student));
            }
            return;
        }

        if (!modal.classList.contains('hidden')) {
             if (!modalContent.contains(e.target)) {
                if (!e.target.closest('button, a')) {
                   // hideModal();
                }
             }
        }
    });


    modalContent.addEventListener('click', e => {
        const target = e.target;
        
        if (target.id === 'cancel-modal-btn' || target.closest('#cancel-modal-btn')) {
            e.stopPropagation();
            hideModal();
            return;
        }
        
        const studentId = target.dataset.id || target.closest('[data-id]')?.dataset.id;
        
        if (target.id === 'record-attendance-geldi') { e.stopPropagation(); handleAttendanceUpdate(studentId, 'geldi'); }
        if (target.id === 'record-attendance-gelmedi') { e.stopPropagation(); handleAttendanceUpdate(studentId, 'gelmedi'); }
        if (target.id === 'record-attendance-telafi-btn') { e.stopPropagation(); document.getElementById('telafi-form').classList.toggle('hidden'); }
        
        if (target.closest('#toggle-student-status-btn')) {
            e.stopPropagation();
            handleStudentStatusToggle(target.closest('#toggle-student-status-btn').dataset.id);
        }
        if (target.closest('#send-whatsapp-btn')) {
            e.stopPropagation();
            sendViaWhatsApp(target.closest('#send-whatsapp-btn').dataset.id);
        }
        if (target.closest('#send-email-btn')) {
            e.stopPropagation();
            sendViaEmail(target.closest('#send-email-btn').dataset.id);
        }
        if (target.closest('.delete-attendance-btn')) {
            e.stopPropagation();
            const button = target.closest('.delete-attendance-btn');
            const studentIdToDelete = button.dataset.studentId;
            const attendanceIndex = parseInt(button.dataset.attendanceIndex, 10);
            handleAttendanceDelete(studentIdToDelete, attendanceIndex);
        }
         if (target.closest('.delete-payment-btn')) {
            e.stopPropagation();
            const button = target.closest('.delete-payment-btn');
            const studentIdToDelete = button.dataset.studentId;
            const paymentIndex = parseInt(button.dataset.paymentIndex, 10);
            handlePaymentDelete(studentIdToDelete, paymentIndex);
        }
    });
    
    // GÜNCELLENDİ: Telafi Formu (Oda kontrolü eklendi)
    modalContent.addEventListener('submit', (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        if (e.target.id === 'telafi-form') {
            const studentId = e.target.querySelector('button').dataset.id;
            const date = e.target.elements.telafiDate.value;
            const time = e.target.elements.telafiTime.value;
            const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
            const dayName = days[new Date(date).getUTCDay()];
            const errorP = document.getElementById('telafi-form-error');
            errorP.textContent = ''; 

            if (date && time) {
                const student = state.students.find(s => s.id == studentId);
                if (!student) return;

                const course = state.courses.find(c => c.id === student.courseId);
                if (!course) return;

                // Telafi için öğrencinin KENDİ KURSUNUN odasını kontrol et
                const telafiRoom = state.rooms.find(r => r.id === course.roomId);
                const roomCapacity = telafiRoom ? telafiRoom.capacity : 0;
                
                const activeStudents = state.students.filter(s => s.status === 'active');

                // O odada, o gün ve saatte kaç kişi var?
                const studentsInRoomAtTime = activeStudents.filter(s => {
                    const studentCourse = state.courses.find(c => c.id === s.courseId);
                    return studentCourse &&
                           studentCourse.roomId === course.roomId && // Aynı odada
                           s.day === dayName && // Aynı gün
                           s.time === time; // Aynı saat
                });

                // O odada, o gün ve saatte kaç telafi var?
                const makeupsInRoomAtTime = activeStudents.flatMap(s => s.attendance || [])
                    .filter(a => {
                        const makeupStudent = state.students.find(st => st.id == a.studentId);
                        if (!makeupStudent) return false;
                        const makeupCourse = state.courses.find(c => c.id === makeupStudent.courseId);
                        return makeupCourse &&
                               a.status === 'telafi' &&
                               a.date === date &&
                               a.time === time &&
                               makeupCourse.roomId === course.roomId;
                    }).length;
                
                const totalInSlot = studentsInRoomAtTime.length + makeupsInRoomAtTime;

                if (totalInSlot >= roomCapacity) {
                    errorP.textContent = `Bu saat dolu! (${telafiRoom.name} Kapasite: ${roomCapacity})`;
                    return;
                }

                handleAttendanceUpdate(studentId, 'telafi', { date, day: dayName, time });
            }
        } else if (e.target.id === 'student-form') {
            handleStudentFormSubmit(e);
        } else if (e.target.id === 'course-form') {
            handleCourseFormSubmit(e);
        } else if (e.target.id === 'room-form') {
            handleRoomFormSubmit(e);
        } else if (e.target.id === 'payment-form') {
            handlePaymentFormSubmit(e);
        }
    });

    document.querySelector('main').addEventListener('click', handleTableClicks);
    
    // --- AUTHENTICATION ---
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = authForm.email.value;
        const password = authForm.password.value;
        const errorP = document.getElementById('auth-error');
        errorP.textContent = '';
        loadingOverlay.classList.remove('hidden');

        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                errorP.textContent = 'E-posta veya şifre hatalı.';
                loadingOverlay.classList.add('hidden');
            });
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            loginScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');
            loadData();
            showPage('dashboard');
        } else {
            appContainer.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            loadingOverlay.classList.add('hidden');
        }
    });

    async function handlePaymentDelete(studentId, paymentIndex) {
        const student = state.students.find(s => s.id === studentId);
        if (!student || !student.payments || !student.payments[paymentIndex]) return;

        if (confirm('Bu ödeme kaydını silmek istediğinizden emin misiniz?')) {
            loadingOverlay.classList.remove('hidden');
            const newPayments = [...student.payments];
            newPayments.splice(paymentIndex, 1);
            
            try {
                await db.collection('students').doc(studentId).update({ payments: newPayments });
                const updatedStudent = { ...student, payments: newPayments };
                showModal(getPaymentFormHTML(updatedStudent));
            } catch (error) {
                console.error("Ödeme silinemedi:", error);
            } finally {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    // GÜNCELLENDİ: handleDownloadPDF (Odayı kurstan alıyor)
    function handleDownloadPDF() {
        const filters = {
            name: document.getElementById('student-search').value,
            courseId: document.getElementById('student-course-filter').value,
            paymentStatus: document.getElementById('student-payment-filter').value,
            status: document.getElementById('student-status-filter').value
        };

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

        const dayOrder = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        filteredStudents.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

        const tableBody = filteredStudents.map(student => {
            const course = state.courses.find(c => c.id === student.courseId);
            const room = course ? state.rooms.find(r => r.id === course.roomId) : null;
            return `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 6px;">${course ? course.instructor : 'N/A'}</td>
                    <td style="border: 1px solid #ddd; padding: 6px;">${student.firstName} ${student.lastName}</td>
                    <td style="border: 1px solid #ddd; padding: 6px;">${course ? course.name : 'N/A'}</td>
                    <td style="border: 1px solid #ddd; padding: 6px;">${student.day} ${student.time}</td>
                    <td style="border: 1px solid #ddd; padding: 6px;">${room ? room.name : 'N/A'}</td>
                </tr>
            `;
        }).join('');

        let title = "Öğrenci Ders Raporu";
        if (filters.courseId) {
            const course = state.courses.find(c => c.id === filters.courseId);
            if (course) title = `${course.name} - ${title}`;
        }
        
        const date = new Date().toLocaleDateString('tr-TR');

        let html = `<div style="font-family: Arial, sans-serif; padding: 20px;">`;
        html += `<h1 style="font-size: 18px; text-align: center; margin-bottom: 5px;">${title}</h1>`;
        html += `<p style="font-size: 11px; text-align: center; margin-bottom: 15px;">Tarih: ${date}</p>`;
        html += `<table style="width: 100%; border-collapse: collapse; font-size: 10px;">`;
        html += '<thead><tr>';
        const head = ['Eğitmen', 'Öğrenci Adı Soyadı', 'Kurs', 'Ders Günü ve Saati', 'Oda'];
        head.forEach(h => {
            html += `<th style="border: 1px solid #ddd; padding: 6px; background-color: #f2f2f2; text-align: left;">${h}</th>`;
        });
        html += '</tr></thead>';
        html += '<tbody>';
        html += tableBody;
        html += '</tbody></table></div>';
        
        const printArea = document.getElementById('print-area');
        printArea.innerHTML = html;
        printArea.classList.remove('hidden');
        window.print();
        printArea.classList.add('hidden');
        printArea.innerHTML = '';
    }

    // --- Raporlama Fonksiyonları ---
    function handlePrintReportsPage() {
        const reportPage = document.getElementById('reports-page');
        if (!reportPage) return;
        const reportContent = reportPage.cloneNode(true);
        reportContent.querySelector('button#print-reports-page-btn').remove();
        const dateFilters = reportContent.querySelector('.flex.flex-col.md\\:flex-row.gap-4.mb-4');
        if(dateFilters) dateFilters.remove();
        
        const printArea = document.getElementById('print-area');
        printArea.innerHTML = '';
        printArea.appendChild(reportContent);
        
        printArea.classList.remove('hidden');
        doc.save('kurs_ogrenci_listesi.pdf');
    }

    function renderReportsPage() {
        const endDateInput = document.getElementById('report-end-date');
        const startDateInput = document.getElementById('report-start-date');
        
        if (!endDateInput.value) {
            const today = new Date();
            endDateInput.valueAsDate = today;
            
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startDateInput.valueAsDate = startOfMonth;
        }
        handleGenerateReport();
        renderStudentReports();
        renderOperationalReports();
    }

    function handleGenerateReport() {
        const startDate = document.getElementById('report-start-date').valueAsDate;
        const endDate = document.getElementById('report-end-date').valueAsDate;
        
        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
        }

        renderFinancialReports(startDate, endDate);
    }

    function renderFinancialReports(startDate, endDate) {
        let totalRevenue = 0;
        let totalDue = 0;
        const revenueByCourse = {};

        const activeStudents = state.students.filter(s => s.status === 'active');

        activeStudents.forEach(student => {
            const balance = (student.payments || []).reduce((sum, p) => sum + p.amount, 0);
            if (balance < 0) {
                totalDue += balance;
            }

            (student.payments || []).forEach(p => {
                if(!p.date) return;
                const paymentDate = new Date(p.date);
                if (p.type === 'payment' && (!startDate || paymentDate >= startDate) && (!endDate || paymentDate <= endDate)) {
                    totalRevenue += p.amount;
                    
                    const course = state.courses.find(c => c.id === student.courseId);
                    if (course) {
                        if (!revenueByCourse[course.name]) {
                            revenueByCourse[course.name] = 0;
                        }
                        revenueByCourse[course.name] += p.amount;
                    }
                }
            });
        });

        document.getElementById('report-total-revenue').textContent = `${totalRevenue.toFixed(2)} ₺`;
        document.getElementById('report-total-due').textContent = `${totalDue.toFixed(2)} ₺`;

        const revenueBody = document.getElementById('report-revenue-by-course-body');
        revenueBody.innerHTML = '';
        for (const courseName in revenueByCourse) {
            revenueBody.innerHTML += `
                <tr class="border-b">
                    <td class="p-3">${courseName}</td>
                    <td class="p-3">${revenueByCourse[courseName].toFixed(2)} ₺</td>
                </tr>
            `;
        }
         if (Object.keys(revenueByCourse).length === 0) {
             revenueBody.innerHTML = '<tr><td colspan="2" class="p-3 text-gray-500 text-center">Seçili aralıkta gelir kaydı bulunamadı.</td></tr>';
        }
    }

    function renderStudentReports() {
        const monthlyData = {};
        state.students.forEach(s => {
            if (!s.registrationDate) return;
            const regDate = new Date(s.registrationDate);
            const monthYear = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = 0;
            }
            monthlyData[monthYear]++;
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(monthYear => {
            const [year, month] = monthYear.split('-');
            return new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
        });
        const data = sortedMonths.map(monthYear => monthlyData[monthYear]);

        const ctx = document.getElementById('new-students-chart').getContext('2d');
        if (newStudentsChartInstance) {
            newStudentsChartInstance.destroy();
        }
        newStudentsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Yeni Öğrenci Sayısı',
                    data: data,
                    backgroundColor: 'rgba(79, 70, 229, 0.8)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                responsive: true,
                maintainAspectRatio: true
            }
        });

        const absenteeismBody = document.getElementById('report-absenteeism-body');
        absenteeismBody.innerHTML = '';
        const activeStudents = state.students.filter(s => s.status === 'active');
        
        const absentees = activeStudents.map(s => {
            const absences = (s.attendance || []).filter(a => a.status === 'gelmedi').length;
            return { name: `${s.firstName} ${s.lastName}`, absences };
        }).filter(s => s.absences > 0);

        absentees.sort((a, b) => b.absences - a.absences);
        
        if(absentees.length === 0){
            absenteeismBody.innerHTML = '<tr><td colspan="2" class="p-3 text-gray-500 text-center">Devamsızlık kaydı bulunamadı.</td></tr>';
        } else {
            absentees.forEach(s => {
                absenteeismBody.innerHTML += `
                    <tr class="border-b">
                        <td class="p-3">${s.name}</td>
                        <td class="p-3">${s.absences}</td>
                    </tr>
                `;
            });
        }
    }

    function renderOperationalReports() {
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

        const workloadBody = document.getElementById('report-instructor-workload-body');
        workloadBody.innerHTML = '';
        const workload = {};

        activeStudents.forEach(student => {
            const course = state.courses.find(c => c.id === student.courseId);
            if (course) {
                const instructor = course.instructor;
                if (!workload[instructor]) {
                    workload[instructor] = 0;
                }
                workload[instructor]++;
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
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFont('LiberationSans-Regular');

        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        doc.setFontSize(18);
        doc.text("Yönetim Raporu", 14, 22);
        doc.setFontSize(11);
        doc.text(`Tarih Aralığı: ${startDate} - ${endDate}`, 14, 28);

        const totalRevenue = document.getElementById('report-total-revenue').textContent;
        const totalDue = document.getElementById('report-total-due').textContent;
        doc.setFontSize(12);
        doc.text(`Toplam Gelir (Seçili Aralık): ${totalRevenue}`, 14, 40);
        doc.text(`Toplam Alacak (Tüm Aktif Öğrenciler): ${totalDue}`, 14, 46);

        const getTableData = (tableBodyId) => {
            const table = document.getElementById(tableBodyId);
            const body = [];
            table.querySelectorAll('tr').forEach(tr => {
                const row = [];
                tr.querySelectorAll('td').forEach(td => row.push(td.textContent));
                if(row.length > 0 && !tr.querySelector('.text-gray-500')) {
                    body.push(row);
                }
            });
            return body;
        };

        const tableStyles = {
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], font: 'LiberationSans-Regular' },
            styles: { font: 'LiberationSans-Regular' }
        };

        doc.autoTable({
            startY: 55,
            head: [['Kurs', 'Toplam Gelir']],
            body: getTableData('report-revenue-by-course-body'),
            ...tableStyles
        });

        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 10,
            head: [['Öğrenci', 'Devamsızlık']],
            body: getTableData('report-absenteeism-body'),
            ...tableStyles
        });
        
        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 10,
            head: [['Kurs', 'Öğrenci Sayısı']],
            body: getTableData('report-course-popularity-body'),
            ...tableStyles
        });

        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 10,
            head: [['Eğitmen', 'Öğrenci Sayısı']],
            body: getTableData('report-instructor-workload-body'),
            ...tableStyles
        });

        doc.save('yonetim_raporu.pdf');
    }

});
