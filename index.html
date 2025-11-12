<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Sanat Evi Kurs Yönetim Sistemi</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js"></script>
    <script src="https://raw.githack.com/parallax/jsPDF/master/examples/fonts/LiberationSans-Regular-normal.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>

</head>
<body class="bg-gray-100">

    <div id="loading-overlay" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
    </div>

    <div id="login-screen" class="fixed inset-0 bg-gray-100 flex items-center justify-center z-40 hidden">
        </div>

    <div id="app" class="hidden relative min-h-screen md:flex">
        
        <div id="menu-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-20 hidden md:hidden"></div>

        <aside id="sidebar" class="bg-gray-800 text-white w-64 flex-shrink-0 absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-300 ease-in-out z-30 flex flex-col">
            <div class="h-16 flex items-center justify-center text-2xl font-bold border-b border-gray-700 flex-shrink-0 px-4">
                <i class="fas fa-palette mr-3"></i> 
                <span>Alegori Sanat Evi</span>
            </div>
            <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                <a href="#dashboard" class="nav-link instructor-only flex items-center px-4 py-2 rounded-md hover:bg-gray-700 active:bg-indigo-600">
                    <i class="fas fa-tachometer-alt w-6 text-center sidebar-icon"></i><span class="ml-3">Ana Sayfa</span>
                </a>
                
                <a href="#students" class="nav-link admin-only flex items-center px-4 py-2 rounded-md hover:bg-gray-700">
                    <i class="fas fa-users w-6 text-center sidebar-icon"></i><span class="ml-3">Öğrenciler</span>
                </a>
                <a href="#users" class="nav-link admin-only flex items-center px-4 py-2 rounded-md hover:bg-gray-700">
                    <i class="fas fa-user-shield w-6 text-center sidebar-icon"></i><span class="ml-3">Personel</span>
                </a>
                <a href="#courses" class="nav-link admin-only flex items-center px-4 py-2 rounded-md hover:bg-gray-700">
                    <i class="fas fa-book w-6 text-center sidebar-icon"></i><span class="ml-3">Kurslar</span>
                </a>
                <a href="#rooms" class="nav-link admin-only flex items-center px-4 py-2 rounded-md hover:bg-gray-700">
                    <i class="fas fa-door-open w-6 text-center sidebar-icon"></i><span class="ml-3">Odalar</span>
                </a>
                <a href="#payments" class="nav-link admin-only flex items-center px-4 py-2 rounded-md hover:bg-gray-700">
                    <i class="fas fa-lira-sign w-6 text-center sidebar-icon"></i><span class="ml-3">Ödemeler</span>
                </a>
                <a href="#calendar" class="nav-link admin-only flex items-center px-4 py-2 rounded-md hover:bg-gray-700">
                    <i class="fas fa-calendar-alt w-6 text-center sidebar-icon"></i><span class="ml-3">Ders Programı</span>
                </a>
                 <a href="#reports" class="nav-link admin-only flex items-center px-4 py-2 rounded-md hover:bg-gray-700">
                    <i class="fas fa-chart-pie w-6 text-center sidebar-icon"></i><span class="ml-3">Raporlar</span>
                </a>

                <a href="#how-to-use" class="nav-link instructor-only flex items-center px-4 py-2 rounded-md hover:bg-gray-700">
                    <i class="fas fa-question-circle w-6 text-center sidebar-icon"></i><span class="ml-3">Nasıl Kullanılır?</span>
                </a>
            </nav>
            <div class="p-4 border-t border-gray-700">
                <button id="logout-button" class="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
                    <i class="fas fa-sign-out-alt mr-2"></i> Çıkış Yap
                </button>
            </div>
        </aside>

        <div class="flex-1 flex flex-col">
            <header class="md:hidden flex justify-between items-center bg-white p-4 shadow-md">
                </header>

            <main class="flex-1 p-6 md:p-10 overflow-y-auto">
                
                <div id="dashboard-page" class="page">
                    </div>

                <div id="students-page" class="page admin-only">
                    <div class="flex justify-between items-center mb-6">
                        <h1 class="text-3xl font-bold text-gray-800">Öğrenci Yönetimi</h1>
                        <div class="flex gap-2">
                             <button id="download-pdf-btn" class="bg-red-600 text-white p-2 md:px-4 md:py-2 rounded-lg shadow hover:bg-red-700 flex items-center">
                                <i class="fas fa-file-pdf md:mr-2"></i> <span class="hidden md:inline">PDF İndir</span>
                            </button>
                            <button id="add-student-btn" class="bg-indigo-600 text-white p-2 md:px-4 md:py-2 rounded-lg shadow hover:bg-indigo-700 flex items-center">
                                <i class="fas fa-plus md:mr-2"></i> <span class="hidden md:inline">Yeni Öğrenci Ekle</span>
                            </button>
                        </div>
                    </div>
                    </div>

                <div id="users-page" class="page admin-only">
                    <div class="flex justify-between items-center mb-6">
                        <h1 class="text-3xl font-bold text-gray-800">Personel Yönetimi</h1>
                        <button id="add-user-btn" class="bg-teal-600 text-white p-2 md:px-4 md:py-2 rounded-lg shadow hover:bg-teal-700 flex items-center">
                            <i class="fas fa-plus md:mr-2"></i> <span class="hidden md:inline">Yeni Personel Ekle</span>
                        </button>
                    </div>
                    </div>

                <div id="courses-page" class="page admin-only">
                     <div class="flex justify-between items-center mb-6">
                        <h1 class="text-3xl font-bold text-gray-800">Kurs Yönetimi</h1>
                        <button id="add-course-btn" class="bg-green-600 text-white p-2 md:px-4 md:py-2 rounded-lg shadow hover:bg-green-700 flex items-center">
                            <i class="fas fa-plus md:mr-2"></i> <span class="hidden md:inline">Yeni Kurs Ekle</span>
                        </button>
                    </div>
                    </div>
                
                <div id="rooms-page" class="page admin-only">
                     <div class="flex justify-between items-center mb-6">
                        <h1 class="text-3xl font-bold text-gray-800">Oda Yönetimi</h1>
                        <button id="add-room-btn" class="bg-blue-600 text-white p-2 md:px-4 md:py-2 rounded-lg shadow hover:bg-blue-700 flex items-center">
                            <i class="fas fa-plus md:mr-2"></i> <span class="hidden md:inline">Yeni Oda Ekle</span>
                        </button>
                    </div>
                    </div>

                <div id="payments-page" class="page admin-only">
                    </div>

                <div id="calendar-page" class="page admin-only">
                    </div>
                
                <div id="reports-page" class="page admin-only">
                    </div>

                <div id="how-to-use-page" class="page instructor-only">
                    </div>

            </main>
        </div>
    </div>
    
    <div id="modal" class="fixed inset-0 z-40 hidden overflow-y-auto">
        </div>

    <div id="print-area" class="hidden"></div>
    
    <script defer src="app.js"></script>

</body>
</html>
