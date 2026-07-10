// app.js

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// --- Элементы DOM ---
const chooseTourBtn = document.getElementById('chooseTourBtn');
const myBookingsBtn = document.getElementById('myBookingsBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const greetingMessage = document.getElementById('greetingMessage');
const monthYear = document.getElementById('monthYear');
const daysGrid = document.getElementById('daysGrid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const toursList = document.getElementById('toursList');
const myBookingsList = document.getElementById('myBookingsList');
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

// Админ-элементы
const adminDate = document.getElementById('adminDate');
const adminTime = document.getElementById('adminTime');
const adminRoute = document.getElementById('adminRoute');
const adminMaxSpots = document.getElementById('adminMaxSpots');
const adminPrice = document.getElementById('adminPrice');
const adminDescription = document.getElementById('adminDescription');
const adminMapUrl = document.getElementById('adminMapUrl');
const addTourBtn = document.getElementById('addTourBtn');
const adminToursList = document.getElementById('adminToursList');

// --- Состояние ---
let currentUser = tg?.initDataUnsafe?.user || null;
let tours = [];
let toursByDate = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
const ADMIN_PASSWORD = 'admin123'; // ⚠️ ЗАМЕНИТЕ НА СВОЙ ПАРОЛЬ

// --- Вспомогательные функции ---
function getToday() {
  return new Date().toISOString().split('T')[0];
}

function formatDateForDisplay(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function isDateInPast(dateStr) {
  return dateStr < getToday();
}

function daysUntil(dateStr) {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = target - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// --- Показ экранов ---
function showScreen(screenName) {
  const screens = ['greetingScreen', 'calendarScreen', 'toursScreen', 'bookingForm', 'myBookingsScreen', 'adminScreen'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === screenName) ? 'block' : 'none';
  });
}

// ===================== ЗАГРУЗКА ТУРОВ =====================
function loadTours() {
  console.log('🔄 loadTours вызвана');
  const toursRef = database.ref('tours');
  toursRef.once('value').then(snapshot => {
    const data = snapshot.val();
    console.log('📦 Данные из Firebase (tours):', data);
    if (data) {
      tours = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      toursByDate = tours.reduce((acc, tour) => {
        const date = tour.date;
        if (!date) return acc;
        if (!acc[date]) acc[date] = [];
        acc[date].push(tour);
        return acc;
      }, {});
      console.log('📅 Сгруппировано по дате:', toursByDate);
      renderCalendar();
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

// ===================== КАЛЕНДАРЬ =====================
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
  const today = getToday();

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

// ===================== ТУРЫ НА ДАТУ =====================
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

// ===================== ФОРМА БРОНИРОВАНИЯ =====================
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

// ===================== ПОДТВЕРЖДЕНИЕ =====================
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

// ===================== МОИ ПРОГУЛКИ =====================
async function loadMyBookings() {
  const phone = prompt('Введите номер телефона, который вы указывали при бронировании:', '');
  if (!phone) return;

  try {
    const snapshot = await database.ref('bookings').orderByChild('clientPhone').equalTo(phone).once('value');
    const data = snapshot.val();
    if (!data) {
      myBookingsList.innerHTML = '<p style="text-align:center;">У вас нет бронирований.</p>';
      showScreen('myBookingsScreen');
      return;
    }
    const bookings = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    // Сортируем: сначала предстоящие (по дате и времени)
    bookings.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    renderMyBookings(bookings, phone);
    showScreen('myBookingsScreen');
  } catch (err) {
    console.error('Ошибка загрузки бронирований:', err);
    myBookingsList.innerHTML = '<p style="color:red;">Ошибка загрузки</p>';
    showScreen('myBookingsScreen');
  }
}

function renderMyBookings(bookings, phone) {
  myBookingsList.innerHTML = '';
  const today = getToday();
  let hasUpcoming = false;

  bookings.forEach(booking => {
    const isPast = booking.date < today;
    const daysLeft = daysUntil(booking.date);
    const canCancel = !isPast && daysLeft >= 2;

    if (!isPast) hasUpcoming = true;

    const card = document.createElement('div');
    card.className = 'booking-card';
    const statusLabel = isPast ? '🟢 Прошла' : (daysLeft <= 1 ? '🟡 Завтра' : '🔵 Предстоит');
    card.innerHTML = `
      <h3>${booking.route}</h3>
      <p><strong>${formatDateForDisplay(booking.date)}</strong> в ${booking.time}</p>
      <p>Сапов: ${booking.boardsCount} | Сумма: ${booking.price} руб.</p>
      <p>Статус: ${statusLabel}</p>
      ${booking.comment ? `<p>💬 ${booking.comment}</p>` : ''}
      ${!isPast && canCancel ? `<button class="cancel-btn" data-id="${booking.id}">Отменить (ещё ${daysLeft} дня)</button>` : ''}
      ${!isPast && !canCancel && daysLeft < 2 && daysLeft >= 0 ? `<p style="color:#856404;">⏳ Отмена менее чем за 2 дня невозможна</p>` : ''}
    `;
    const cancelBtn = card.querySelector('.cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (confirm('Вы уверены, что хотите отменить бронирование?')) {
          cancelBooking(booking.id, booking.tourId, booking.boardsCount, phone);
        }
      });
    }
    myBookingsList.appendChild(card);
  });

  if (!hasUpcoming) {
    const msg = document.createElement('p');
    msg.style.textAlign = 'center';
    msg.style.marginTop = '10px';
    msg.style.color = '#888';
    msg.textContent = 'У вас нет предстоящих прогулок.';
    myBookingsList.appendChild(msg);
  }
}

function cancelBooking(bookingId, tourId, boardsCount, phone) {
  const bookingRef = database.ref(`bookings/${bookingId}`);
  bookingRef.remove()
    .then(() => {
      // Уменьшаем booked в туре
      const tourRef = database.ref(`tours/${tourId}/booked`);
      tourRef.transaction(current => {
        return (current || 0) - boardsCount;
      });
      alert('✅ Бронирование отменено');
      // Обновляем список
      loadMyBookingsByPhone(phone);
    })
    .catch(err => {
      alert('❌ Ошибка отмены: ' + err.message);
    });
}

function loadMyBookingsByPhone(phone) {
  database.ref('bookings').orderByChild('clientPhone').equalTo(phone).once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (!data) {
        myBookingsList.innerHTML = '<p style="text-align:center;">У вас нет бронирований.</p>';
        return;
      }
      const bookings = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      bookings.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      renderMyBookings(bookings, phone);
    })
    .catch(err => {
      console.error('Ошибка обновления:', err);
    });
}

// ===================== АДМИН-ПАНЕЛЬ =====================
function loadAdminTours() {
  const toursRef = database.ref('tours');
  toursRef.once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      adminToursList.innerHTML = '<p style="text-align:center; color:#888;">Туров пока нет</p>';
      return;
    }
    const toursArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    renderAdminTours(toursArray);
  }).catch(err => {
    console.error('Ошибка загрузки туров для админки:', err);
    adminToursList.innerHTML = '<p style="color:red;">Ошибка загрузки</p>';
  });
}

function renderAdminTours(toursArray) {
  adminToursList.innerHTML = '';
  if (toursArray.length === 0) {
    adminToursList.innerHTML = '<p style="text-align:center; color:#888;">Туров пока нет</p>';
    return;
  }
  toursArray.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  toursArray.forEach(tour => {
    const div = document.createElement('div');
    div.className = 'admin-tour-item';
    const info = document.createElement('span');
    info.textContent = `${tour.date} ${tour.time} — ${tour.route} (мест: ${tour.maxSpots - (tour.booked||0)}/${tour.maxSpots})`;
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕ Удалить';
    delBtn.addEventListener('click', function() {
      if (confirm(`Удалить прогулку на ${tour.date} в ${tour.time}?`)) {
        const tourRef = database.ref(`tours/${tour.id}`);
        tourRef.remove().then(() => {
          loadAdminTours();
        }).catch(err => {
          alert('Ошибка удаления: ' + err.message);
        });
      }
    });
    div.appendChild(info);
    div.appendChild(delBtn);
    adminToursList.appendChild(div);
  });
}

if (addTourBtn) {
  addTourBtn.addEventListener('click', function() {
    const date = adminDate.value;
    const time = adminTime.value;
    const route = adminRoute.value.trim();
    const maxSpots = parseInt(adminMaxSpots.value, 10);
    const pricePerBoard = parseInt(adminPrice.value, 10);
    const routeDescription = adminDescription.value.trim();
    const routeMapUrl = adminMapUrl.value.trim();

    if (!date || !time || !route || isNaN(maxSpots) || isNaN(pricePerBoard)) {
      alert('Заполните все обязательные поля (дата, время, маршрут, места, цена)');
      return;
    }
    if (maxSpots < 1) {
      alert('Максимальное мест должно быть не меньше 1');
      return;
    }

    const newTour = {
      date: date,
      time: time,
      route: route,
      maxSpots: maxSpots,
      booked: 0,
      pricePerBoard: pricePerBoard,
      routeDescription: routeDescription || '',
      routeMapUrl: routeMapUrl || ''
    };

    const toursRef = database.ref('tours');
    const newRef = toursRef.push();
    newRef.set(newTour)
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
        showScreen('adminScreen');
      })
      .catch(err => {
        alert('❌ Ошибка сохранения: ' + err.message);
      });
  });
}

// ===================== НАВИГАЦИЯ =====================
if (prevMonthBtn) {
  prevMonthBtn.addEventListener('click', () => {
    if (currentMonth === 0) { currentMonth = 11; currentYear--; } else { currentMonth--; }
    renderCalendar();
  });
}
if (nextMonthBtn) {
  nextMonthBtn.addEventListener('click', () => {
    if (currentMonth === 11) { currentMonth = 0; currentYear++; } else { currentMonth++; }
    renderCalendar();
  });
}

if (chooseTourBtn) {
  chooseTourBtn.addEventListener('click', function() {
    console.log('🖱️ Кнопка "Выбрать свою прогулку" нажата');
    showScreen('calendarScreen');
    loadTours();
  });
}

if (myBookingsBtn) {
  myBookingsBtn.addEventListener('click', function() {
    loadMyBookings();
  });
}

if (adminLoginBtn) {
  adminLoginBtn.addEventListener('click', function() {
    const password = prompt('Введите пароль администратора:');
    if (password === ADMIN_PASSWORD) {
      showScreen('adminScreen');
      loadAdminTours();
    } else if (password !== null) {
      alert('Неверный пароль!');
    }
  });
}

// Приветствие
if (currentUser && currentUser.first_name && greetingMessage) {
  greetingMessage.textContent = `👋 Привет, ${currentUser.first_name}!`;
}

// Инициализация
showScreen('greetingScreen');