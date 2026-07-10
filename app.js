// app.js

// --- Инициализация Telegram ---
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// ============================================================
// ID АДМИНИСТРАТОРА (ТОЛЬКО ЭТОТ ПОЛЬЗОВАТЕЛЬ ВИДИТ АДМИНКУ)
// ============================================================
const ADMIN_ID = 611952; // <--- ВАШ TELEGRAM ID

// ============================================================
// 1. ЭЛЕМЕНТЫ DOM
// ============================================================
const chooseTourBtn = document.getElementById('chooseTourBtn');
const myBookingsBtn = document.getElementById('myBookingsBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const greetingMessage = document.getElementById('greetingMessage');

// Календарь
const monthYear = document.getElementById('monthYear');
const daysGrid = document.getElementById('daysGrid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

// Туры
const toursList = document.getElementById('toursList');

// Форма бронирования
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

// Мои бронирования
const myPhoneInput = document.getElementById('myPhoneInput');
const loadMyBookingsBtn = document.getElementById('loadMyBookingsBtn');
const myBookingsList = document.getElementById('myBookingsList');

// Админ
const adminDate = document.getElementById('adminDate');
const adminTime = document.getElementById('adminTime');
const adminRoute = document.getElementById('adminRoute');
const adminMaxSpots = document.getElementById('adminMaxSpots');
const adminPrice = document.getElementById('adminPrice');
const adminDescription = document.getElementById('adminDescription');
const adminMapUrl = document.getElementById('adminMapUrl');
const addTourBtn = document.getElementById('addTourBtn');
const adminToursList = document.getElementById('adminToursList');

// ============================================================
// 2. СОСТОЯНИЕ
// ============================================================
let currentUser = tg?.initDataUnsafe?.user || null;
let tours = [];
let toursByDate = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// ============================================================
// 3. ПОКАЗ ЭКРАНОВ
// ============================================================
function showScreen(screenName) {
  const screens = ['greetingScreen', 'calendarScreen', 'toursScreen', 'bookingForm', 'myBookingsScreen', 'adminScreen'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === screenName) ? 'block' : 'none';
  });
}

// ============================================================
// 4. ЗАГРУЗКА ТУРОВ (для клиента)
// ============================================================
function loadTours() {
  console.log('🔄 loadTours вызвана');
  const toursRef = database.ref('tours');
  toursRef.once('value').then(snapshot => {
    const data = snapshot.val();
    if (data) {
      tours = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      toursByDate = tours.reduce((acc, tour) => {
        const date = tour.date;
        if (!date) return acc;
        if (!acc[date]) acc[date] = [];
        acc[date].push(tour);
        return acc;
      }, {});
      renderCalendar();
    } else {
      document.getElementById('calendarContainer').innerHTML = '<p style="text-align:center;">Пока нет доступных прогулок.</p>';
    }
  }).catch(err => {
    console.error('Ошибка загрузки туров:', err);
    document.getElementById('calendarContainer').innerHTML = '<p style="color:red;">Ошибка загрузки</p>';
  });
}

// ============================================================
// 5. КАЛЕНДАРЬ
// ============================================================
function renderCalendar() {
  if (!monthYear || !daysGrid) return;
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
        return function() { showToursForDate(d); };
      })(dateStr));
    } else {
      div.classList.add('unavailable');
    }
    if (dateStr < today) div.classList.add('past');
    daysGrid.appendChild(div);
  }
}

// ============================================================
// 6. ТУРЫ ПО ДАТЕ
// ============================================================
function showToursForDate(date) {
  if (!toursList) return;
  toursList.innerHTML = '';
  const dayTours = toursByDate[date] || [];
  if (dayTours.length === 0) {
    toursList.innerHTML = '<p style="text-align:center;">Нет прогулок</p>';
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
      <p>Свободно: ${available}</p>
      <p>Цена: ${tour.pricePerBoard} руб./сап</p>
      <button class="select-tour" data-id="${tour.id}">Выбрать</button>
    `;
    card.querySelector('.select-tour').addEventListener('click', () => {
      showBookingForm(tour);
    });
    toursList.appendChild(card);
  });
  showScreen('toursScreen');
}

// ============================================================
// 7. ФОРМА БРОНИРОВАНИЯ
// ============================================================
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

// ============================================================
// 8. ОТПРАВКА БРОНИРОВАНИЯ
// ============================================================
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
      statusDiv.textContent = '✅ Бронирование создано!';
      statusDiv.className = 'success';
      form.reset();
      showConfirmation(bookingData);
    })
    .catch(err => {
      console.error('Ошибка:', err);
      statusDiv.textContent = '❌ Ошибка при сохранении.';
      statusDiv.className = 'error';
    });
});

// ============================================================
// 9. ПОДТВЕРЖДЕНИЕ
// ============================================================
function showConfirmation(booking) {
  const tour = tours.find(t => t.id === booking.tourId);
  const routeDesc = tour?.routeDescription || '';
  const mapUrl = tour?.routeMapUrl || '';

  const confirmScreen = document.createElement('div');
  confirmScreen.id = 'confirmScreen';
  confirmScreen.innerHTML = `
    <h2>✅ Готово!</h2>
    <div class="confirm-details">
      <p><strong>${booking.route}</strong></p>
      <p>Дата: ${booking.date}</p>
      <p>Время: ${booking.time}</p>
      <p>Сапов: ${booking.boardsCount}</p>
      <p>Сумма: ${booking.price} руб.</p>
      ${routeDesc ? `<p>${routeDesc}</p>` : ''}
      ${mapUrl ? `<p><a href="${mapUrl}" target="_blank" style="color:var(--tg-theme-button-color, #0088cc);">📍 Открыть на карте</a></p>` : ''}
    </div>
    <button onclick="window.location.reload()">Новое бронирование</button>
  `;
  document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
  document.getElementById('app').appendChild(confirmScreen);
}

// ============================================================
// 10. МОИ БРОНИРОВАНИЯ
// ============================================================
loadMyBookingsBtn.addEventListener('click', function() {
  const phone = myPhoneInput.value.trim();
  if (!phone) {
    alert('Введите ваш номер телефона');
    return;
  }
  loadMyBookings(phone);
});

function loadMyBookings(phone) {
  myBookingsList.innerHTML = 'Загрузка...';
  const bookingsRef = database.ref('bookings');
  bookingsRef.orderByChild('clientPhone').equalTo(phone).once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (!data) {
        myBookingsList.innerHTML = '<p style="text-align:center;">У вас пока нет бронирований.</p>';
        return;
      }
      const bookingsArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      const now = new Date().toISOString().split('T')[0];
      const futureBookings = bookingsArray.filter(b => b.date >= now)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

      if (futureBookings.length === 0) {
        myBookingsList.innerHTML = '<p style="text-align:center;">Нет предстоящих бронирований.</p>';
        return;
      }

      myBookingsList.innerHTML = '';
      futureBookings.forEach(booking => {
        const canCancel = canCancelBooking(booking.date);
        const div = document.createElement('div');
        div.className = 'booking-card';
        div.innerHTML = `
          <div><strong>${booking.route}</strong></div>
          <div>${booking.date} в ${booking.time}</div>
          <div>Сапов: ${booking.boardsCount} | Сумма: ${booking.price} руб.</div>
          <button class="cancel-btn" data-id="${booking.id}" data-tour="${booking.tourId}" data-boards="${booking.boardsCount}" ${canCancel ? '' : 'disabled'}>
            ${canCancel ? '❌ Отменить' : 'Отмена недоступна (менее 2 дней)'}
          </button>
        `;
        myBookingsList.appendChild(div);
      });

      document.querySelectorAll('.cancel-btn').forEach(btn => {
        if (!btn.disabled) {
          btn.addEventListener('click', function() {
            const bookingId = this.dataset.id;
            const tourId = this.dataset.tour;
            const boards = parseInt(this.dataset.boards, 10);
            cancelBooking(bookingId, tourId, boards);
          });
        }
      });
    })
    .catch(err => {
      console.error('Ошибка загрузки бронирований:', err);
      myBookingsList.innerHTML = '<p style="color:red;">Ошибка загрузки</p>';
    });
}

function canCancelBooking(date) {
  const today = new Date();
  const tourDate = new Date(date + 'T00:00:00');
  const diff = (tourDate - today) / (1000 * 60 * 60 * 24);
  return diff >= 2;
}

function cancelBooking(bookingId, tourId, boards) {
  if (!confirm('Вы уверены, что хотите отменить бронирование?')) return;
  const bookingRef = database.ref(`bookings/${bookingId}`);
  bookingRef.remove()
    .then(() => {
      const tourRef = database.ref(`tours/${tourId}/booked`);
      tourRef.transaction((current) => {
        return Math.max(0, (current || 0) - boards);
      });
      alert('✅ Бронирование отменено');
      const phone = myPhoneInput.value.trim();
      if (phone) loadMyBookings(phone);
    })
    .catch(err => {
      alert('❌ Ошибка отмены: ' + err.message);
    });
}

// ============================================================
// 11. НАВИГАЦИЯ КАЛЕНДАРЯ
// ============================================================
prevMonthBtn.addEventListener('click', () => {
  if (currentMonth === 0) { currentMonth = 11; currentYear--; } else { currentMonth--; }
  renderCalendar();
});
nextMonthBtn.addEventListener('click', () => {
  if (currentMonth === 11) { currentMonth = 0; currentYear++; } else { currentMonth++; }
  renderCalendar();
});

// ============================================================
// 12. АДМИН-ПАНЕЛЬ (только для администратора)
// ============================================================

// Скрываем кнопку админа для всех, кроме администратора
if (currentUser && currentUser.id === ADMIN_ID) {
  adminLoginBtn.style.display = 'block';
} else {
  adminLoginBtn.style.display = 'none';
}

adminLoginBtn.addEventListener('click', function() {
  if (currentUser && currentUser.id === ADMIN_ID) {
    showScreen('adminScreen');
    loadAdminTours();
  } else {
    alert('Доступ запрещён');
  }
});

function loadAdminTours() {
  const toursRef = database.ref('tours');
  toursRef.once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      adminToursList.innerHTML = '<p style="text-align:center;">Туров пока нет</p>';
      return;
    }
    const toursArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    renderAdminTours(toursArray);
  }).catch(err => {
    console.error(err);
    adminToursList.innerHTML = '<p style="color:red;">Ошибка загрузки</p>';
  });
}

function renderAdminTours(toursArray) {
  adminToursList.innerHTML = '';
  if (toursArray.length === 0) {
    adminToursList.innerHTML = '<p style="text-align:center;">Туров пока нет</p>';
    return;
  }
  toursArray.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  toursArray.forEach(tour => {
    const div = document.createElement('div');
    div.className = 'tour-item';
    const info = document.createElement('span');
    info.textContent = `${tour.date} ${tour.time} — ${tour.route} (мест: ${tour.maxSpots - (tour.booked||0)}/${tour.maxSpots})`;
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕ Удалить';
    delBtn.addEventListener('click', function() {
      if (confirm(`Удалить прогулку на ${tour.date} в ${tour.time}?`)) {
        const tourRef = database.ref(`tours/${tour.id}`);
        tourRef.remove().then(() => loadAdminTours()).catch(err => alert('Ошибка: ' + err.message));
      }
    });
    div.appendChild(info);
    div.appendChild(delBtn);
    adminToursList.appendChild(div);
  });
}

addTourBtn.addEventListener('click', function() {
  const date = adminDate.value;
  const time = adminTime.value;
  const route = adminRoute.value.trim();
  const maxSpots = parseInt(adminMaxSpots.value, 10);
  const price = parseInt(adminPrice.value, 10);
  const description = adminDescription.value.trim();
  const mapUrl = adminMapUrl.value.trim();

  if (!date || !time || !route || isNaN(maxSpots) || isNaN(price)) {
    alert('Заполните все обязательные поля');
    return;
  }

  const newTour = {
    date, time, route,
    maxSpots,
    booked: 0,
    pricePerBoard: price,
    routeDescription: description || '',
    routeMapUrl: mapUrl || ''
  };

  const toursRef = database.ref('tours');
  toursRef.push(newTour)
    .then(() => {
      alert('✅ Прогулка добавлена!');
      adminDate.value = '';
      adminTime.value = '';
      adminRoute.value = '';
      adminMaxSpots.value = '14';
      adminPrice.value = '1700';
      adminDescription.value = '';
      adminMapUrl.value = '';
      loadAdminTours();
    })
    .catch(err => alert('❌ Ошибка: ' + err.message));
});

// ============================================================
// 13. КНОПКИ ГЛАВНОГО ЭКРАНА
// ============================================================
chooseTourBtn.addEventListener('click', function() {
  showScreen('calendarScreen');
  loadTours();
});

myBookingsBtn.addEventListener('click', function() {
  showScreen('myBookingsScreen');
  const phone = myPhoneInput.value.trim();
  if (phone) loadMyBookings(phone);
});

// ============================================================
// 14. ПРИВЕТСТВИЕ
// ============================================================
if (currentUser && currentUser.first_name && greetingMessage) {
  greetingMessage.textContent = `👋 Привет, ${currentUser.first_name}!`;
}

showScreen('greetingScreen');