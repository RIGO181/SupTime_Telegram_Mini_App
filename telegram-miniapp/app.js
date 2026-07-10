// app.js

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// --- Элементы DOM ---
const chooseTourBtn = document.getElementById('chooseTourBtn');
const adminPanelBtn = document.getElementById('adminPanelBtn');
const greetingMessage = document.getElementById('greetingMessage');
const monthYear = document.getElementById('monthYear');
const daysGrid = document.getElementById('daysGrid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const toursList = document.getElementById('toursList');
const adminToursList = document.getElementById('adminToursList');
const tourInfo = document.getElementById('tourInfo');
const tourIdInput = document.getElementById('tourId');
const maxSpotsInput = document.getElementById('maxSpots');
const pricePerBoardInput = document.getElementById('pricePerBoard');
const boardsInput = document.getElementById('boards');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const commentInput = document.getElementById('comment');
const form = document.getElementById('bookingFormInner');
const statusDiv = document.getElementById('statusMessage');

// Элементы админ-панели
const addTourBtn = document.getElementById('addTourBtn');
const tourFormScreen = document.getElementById('tourFormScreen');
const tourFormTitle = document.getElementById('tourFormTitle');
const tourForm = document.getElementById('tourForm');
const editTourIdInput = document.getElementById('editTourId');
const tourDateInput = document.getElementById('tourDate');
const tourTimeInput = document.getElementById('tourTime');
const tourRouteInput = document.getElementById('tourRoute');
const tourMaxSpotsInput = document.getElementById('tourMaxSpots');
const tourPriceInput = document.getElementById('tourPrice');
const tourDurationInput = document.getElementById('tourDuration');
const tourDescInput = document.getElementById('tourDesc');
const tourMapInput = document.getElementById('tourMap');
const tourFormStatus = document.getElementById('tourFormStatus');

// --- Состояние ---
let currentUser = tg?.initDataUnsafe?.user || null;
let currentUserId = currentUser?.id ? String(currentUser.id) : null;
let tours = [];
let toursByDate = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let isAdmin = false;

// --- Показ экранов ---
function showScreen(screenName) {
  const screens = ['greetingScreen', 'calendarScreen', 'toursScreen', 'bookingForm', 'adminPanel', 'tourFormScreen'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === screenName) ? 'block' : 'none';
  });
}

// --- Проверка, является ли пользователь администратором ---
function checkAdmin() {
  if (!currentUserId) return;
  const adminsRef = database.ref('admins/' + currentUserId);
  adminsRef.once('value').then(snapshot => {
    isAdmin = snapshot.val() === true;
    if (isAdmin && adminPanelBtn) {
      adminPanelBtn.style.display = 'block';
    }
  }).catch(err => {
    console.error('Ошибка проверки администратора:', err);
  });
}

// --- Загрузка туров ---
function loadTours() {
  console.log('🔄 loadTours вызвана');
  const toursRef = database.ref('tours');
  toursRef.once('value').then(snapshot => {
    const data = snapshot.val();
    console.log('📦 Данные из Firebase (tours):', data);
    if (data) {
      tours = Object.keys(data).map(key => {
        const tour = data[key];
        return { id: key, ...tour };
      });
      console.log('📋 Массив туров:', tours);
      toursByDate = tours.reduce((acc, tour) => {
        const date = tour.date;
        if (!date) return acc;
        if (!acc[date]) acc[date] = [];
        acc[date].push(tour);
        return acc;
      }, {});
      console.log('📅 Сгруппировано по дате:', toursByDate);
      renderCalendar();
      if (isAdmin) renderAdminTours();
    } else {
      const container = document.getElementById('calendarContainer');
      if (container) container.innerHTML = '<p style="text-align:center;">Пока нет доступных прогулок. Загляните позже.</p>';
    }
  }).catch(err => {
    console.error('Ошибка загрузки туров:', err);
    const container = document.getElementById('calendarContainer');
    if (container) container.innerHTML = '<p style="text-align:center;">Ошибка загрузки. Попробуйте позже.</p>';
  });
}

// --- Рендер календаря ---
function renderCalendar() {
  if (!monthYear || !daysGrid) return;
  console.log('🔄 Рендерим календарь для', currentMonth, currentYear);
  
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  daysGrid.innerHTML = '';

  const weekdays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  weekdays.forEach(day => {
    const div = document.createElement('div');
    div.className = 'weekday';
    div.textContent = day;
    daysGrid.appendChild(div);
  });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = (firstDay === 0) ? 6 : firstDay - 1;
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    daysGrid.appendChild(empty);
  }

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const hasTour = toursByDate[dateStr] && toursByDate[dateStr].length > 0;

    const div = document.createElement('div');
    div.className = 'day';
    div.textContent = day;

    if (hasTour) {
      div.classList.add('available');
      div.addEventListener('click', (function(d) {
        return function() {
          showToursForDate(d);
        };
      })(dateStr));
    } else {
      div.classList.add('unavailable');
    }
    if (dateStr < today) {
      div.classList.add('past');
    }
    daysGrid.appendChild(div);
  }
}

// --- Показать туры для выбранной даты (клиентская часть) ---
function showToursForDate(date) {
  if (!toursList) return;
  toursList.innerHTML = '';

  const dayTours = toursByDate[date] || [];
  if (dayTours.length === 0) {
    toursList.innerHTML = '<p style="text-align:center;">На этот день нет прогулок.</p>';
    showScreen('toursScreen');
    return;
  }

  dayTours.forEach(tour => {
    const available = tour.maxSpots - (tour.booked || 0);
    const card = document.createElement('div');
    card.className = 'tour-card';
    card.innerHTML = `
      <h3>🕐 ${tour.time}</h3>
      <p><strong>${tour.route}</strong></p>
      <p>Свободно мест: ${available}</p>
      <p>Цена: ${tour.pricePerBoard} руб./сап</p>
      <button class="select-tour" data-id="${tour.id}">Выбрать</button>
    `;
    const selectBtn = card.querySelector('.select-tour');
    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        showBookingForm(tour);
      });
    }
    toursList.appendChild(card);
  });
  showScreen('toursScreen');
}

// --- Показать форму бронирования ---
function showBookingForm(tour) {
  tourInfo.textContent = `${tour.route}, ${tour.date} в ${tour.time}`;
  tourIdInput.value = tour.id;
  maxSpotsInput.value = tour.maxSpots;
  pricePerBoardInput.value = tour.pricePerBoard;
  boardsInput.max = tour.maxSpots - (tour.booked || 0);
  boardsInput.value = 1;
  statusDiv.textContent = '';
  statusDiv.className = '';
  nameInput.value = '';
  phoneInput.value = '';
  commentInput.value = '';
  showScreen('bookingForm');
}

// --- Отправка бронирования ---
form.addEventListener('submit', function(e) {
  e.preventDefault();

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const boards = parseInt(boardsInput.value, 10);
  const comment = commentInput.value.trim();
  const tourId = tourIdInput.value;

  if (!name || !phone) {
    statusDiv.textContent = '⚠️ Имя и телефон обязательны';
    statusDiv.className = 'error';
    return;
  }
  if (boards < 1) {
    statusDiv.textContent = '⚠️ Выберите хотя бы 1 сап';
    statusDiv.className = 'error';
    return;
  }

  const tour = tours.find(t => t.id === tourId);
  if (!tour) {
    statusDiv.textContent = '❌ Тур не найден';
    statusDiv.className = 'error';
    return;
  }
  const available = tour.maxSpots - (tour.booked || 0);
  if (boards > available) {
    statusDiv.textContent = `❌ Доступно только ${available} мест`;
    statusDiv.className = 'error';
    return;
  }

  const bookingData = {
    clientName: name,
    clientPhone: phone,
    date: tour.date,
    time: tour.time,
    route: tour.route,
    boardsCount: boards,
    isReservation: false,
    isPaid: false,
    price: tour.pricePerBoard * boards,
    isChild: false,
    childCount: 0,
    comment: comment,
    tourId: tourId,
    timestamp: Date.now()
  };

  const bookingsRef = database.ref('bookings');
  const newBookingRef = bookingsRef.push();

  newBookingRef.set(bookingData)
    .then(() => {
      const tourRef = database.ref(`tours/${tourId}`);
      tourRef.update({ booked: (tour.booked || 0) + boards });

      statusDiv.textContent = '✅ Бронирование успешно создано!';
      statusDiv.className = 'success';
      form.reset();
      showConfirmation(bookingData);
    })
    .catch(err => {
      console.error('Ошибка сохранения:', err);
      statusDiv.textContent = '❌ Ошибка при сохранении. Попробуйте позже.';
      statusDiv.className = 'error';
    });
});

// --- Экран подтверждения ---
function showConfirmation(booking) {
  const tour = tours.find(t => t.id === booking.tourId);
  const routeDesc = tour?.routeDescription || '';
  const mapUrl = tour?.routeMapUrl || '';

  const confirmScreen = document.createElement('div');
  confirmScreen.id = 'confirmScreen';
  confirmScreen.innerHTML = `
    <h2>✅ Бронирование подтверждено!</h2>
    <div class="confirm-details">
      <p><strong>${booking.route}</strong></p>
      <p>Дата: ${booking.date}</p>
      <p>Время: ${booking.time}</p>
      <p>Количество сапов: ${booking.boardsCount}</p>
      <p>Сумма: ${booking.price} руб.</p>
      ${routeDesc ? `<p style="margin-top:8px;">${routeDesc}</p>` : ''}
      ${mapUrl ? `<p><a href="${mapUrl}" target="_blank" style="color:var(--tg-theme-button-color, #0088cc);">📍 Открыть маршрут на карте</a></p>` : ''}
    </div>
    <button onclick="window.location.reload()">Новое бронирование</button>
  `;
  document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
  const app = document.getElementById('app');
  if (app) app.appendChild(confirmScreen);
}

// --- Навигация по календарю ---
if (prevMonthBtn) {
  prevMonthBtn.addEventListener('click', () => {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
    renderCalendar();
  });
}
if (nextMonthBtn) {
  nextMonthBtn.addEventListener('click', () => {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
    renderCalendar();
  });
}

// --- АДМИН-ПАНЕЛЬ ---

// Рендер списка туров для администратора
function renderAdminTours() {
  if (!adminToursList) return;
  adminToursList.innerHTML = '';
  if (tours.length === 0) {
    adminToursList.innerHTML = '<p style="text-align:center;">Прогулок пока нет.</p>';
    return;
  }
  // Сортируем по дате и времени
  const sorted = [...tours].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  sorted.forEach(tour => {
    const available = tour.maxSpots - (tour.booked || 0);
    const card = document.createElement('div');
    card.className = 'tour-card';
    card.innerHTML = `
      <h3>${tour.date} в ${tour.time}</h3>
      <p><strong>${tour.route}</strong></p>
      <p>Мест: ${available} / ${tour.maxSpots}</p>
      <p>Цена: ${tour.pricePerBoard} руб./сап</p>
      <div class="admin-buttons">
        <button class="edit-btn" data-id="${tour.id}">✏️ Редактировать</button>
        <button class="delete-btn" data-id="${tour.id}">🗑️ Удалить</button>
      </div>
    `;
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    editBtn.addEventListener('click', () => editTour(tour));
    deleteBtn.addEventListener('click', () => deleteTour(tour.id));
    adminToursList.appendChild(card);
  });
}

// --- Редактирование тура ---
function editTour(tour) {
  tourFormTitle.textContent = '✏️ Редактировать прогулку';
  editTourIdInput.value = tour.id;
  tourDateInput.value = tour.date;
  tourTimeInput.value = tour.time;
  tourRouteInput.value = tour.route;
  tourMaxSpotsInput.value = tour.maxSpots;
  tourPriceInput.value = tour.pricePerBoard;
  tourDurationInput.value = tour.duration || '';
  tourDescInput.value = tour.routeDescription || '';
  tourMapInput.value = tour.routeMapUrl || '';
  tourFormStatus.textContent = '';
  tourFormStatus.className = '';
  showScreen('tourFormScreen');
}

// --- Удаление тура ---
function deleteTour(tourId) {
  if (!confirm('Вы уверены, что хотите удалить эту прогулку?')) return;
  const tourRef = database.ref(`tours/${tourId}`);
  tourRef.remove()
    .then(() => {
      alert('Прогулка удалена!');
      // Обновляем данные
      loadTours();
      if (isAdmin) renderAdminTours();
    })
    .catch(err => {
      console.error('Ошибка удаления:', err);
      alert('Ошибка удаления. Попробуйте позже.');
    });
}

// --- Сохранение тура (новая или редактирование) ---
tourForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const tourId = editTourIdInput.value;
  const date = tourDateInput.value;
  const time = tourTimeInput.value;
  const route = tourRouteInput.value.trim();
  const maxSpots = parseInt(tourMaxSpotsInput.value, 10);
  const price = parseInt(tourPriceInput.value, 10);
  const duration = tourDurationInput.value.trim();
  const description = tourDescInput.value.trim();
  const mapUrl = tourMapInput.value.trim();

  if (!date || !time || !route || !maxSpots || !price) {
    tourFormStatus.textContent = '⚠️ Заполните все обязательные поля (дата, время, маршрут, места, цена)';
    tourFormStatus.className = 'error';
    return;
  }

  const tourData = {
    date,
    time,
    route,
    maxSpots,
    pricePerBoard: price,
    booked: 0,
    duration,
    routeDescription: description,
    routeMapUrl: mapUrl
  };

  let ref;
  if (tourId) {
    // Редактирование существующего тура
    ref = database.ref(`tours/${tourId}`);
    // Сохраняем booked, чтобы не сбросить
    const existingTour = tours.find(t => t.id === tourId);
    if (existingTour) {
      tourData.booked = existingTour.booked || 0;
    }
  } else {
    // Новый тур
    ref = database.ref('tours').push();
  }

  ref.set(tourData)
    .then(() => {
      tourFormStatus.textContent = '✅ Прогулка сохранена!';
      tourFormStatus.className = 'success';
      // Обновляем данные
      loadTours();
      if (isAdmin) renderAdminTours();
      setTimeout(() => showScreen('adminPanel'), 1000);
    })
    .catch(err => {
      console.error('Ошибка сохранения:', err);
      tourFormStatus.textContent = '❌ Ошибка сохранения. Попробуйте позже.';
      tourFormStatus.className = 'error';
    });
});

// --- Кнопка "Добавить прогулку" ---
addTourBtn.addEventListener('click', function() {
  tourFormTitle.textContent = '➕ Новая прогулка';
  editTourIdInput.value = '';
  tourDateInput.value = '';
  tourTimeInput.value = '';
  tourRouteInput.value = '';
  tourMaxSpotsInput.value = '10';
  tourPriceInput.value = '1700';
  tourDurationInput.value = '';
  tourDescInput.value = '';
  tourMapInput.value = '';
  tourFormStatus.textContent = '';
  tourFormStatus.className = '';
  showScreen('tourFormScreen');
});

// --- Кнопка "Админ-панель" ---
adminPanelBtn.addEventListener('click', function() {
  showScreen('adminPanel');
  renderAdminTours();
});

// --- Кнопка "Выбрать свою прогулку" ---
if (chooseTourBtn) {
  chooseTourBtn.addEventListener('click', function() {
    console.log('🖱️ Кнопка "Выбрать свою прогулку" нажата');
    showScreen('calendarScreen');
    loadTours();
  });
}

// --- Приветствие ---
if (currentUser && currentUser.first_name && greetingMessage) {
  greetingMessage.textContent = `👋 Привет, ${currentUser.first_name}!`;
}

// --- Инициализация ---
showScreen('greetingScreen');
checkAdmin();
loadTours();