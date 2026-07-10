// app.js

// --- Инициализация Telegram WebApp ---
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// --- Элементы DOM (все с проверкой) ---
const chooseTourBtn = document.getElementById('chooseTourBtn');
const greetingMessage = document.getElementById('greetingMessage');
const monthYear = document.getElementById('monthYear');
const daysGrid = document.getElementById('daysGrid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const toursList = document.getElementById('toursList');
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

// --- Переменные состояния ---
let currentUser = tg?.initDataUnsafe?.user || null;
let selectedTour = null;
let selectedDate = null;
let tours = [];
let toursByDate = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// --- Функция показа экранов ---
function showScreen(screenName) {
  const screens = ['greetingScreen', 'calendarScreen', 'toursScreen', 'bookingForm'];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === screenName) ? 'block' : 'none';
  });
}

// --- Загрузка туров из Firebase (исправленная) ---
function loadTours() {
  console.log('🔄 loadTours вызвана');
  const toursRef = database.ref('tours');
  toursRef.once('value').then(snapshot => {
    let data = snapshot.val();
    console.log('📦 Данные из Firebase (tours):', data);
    if (data) {
      // Если data содержит поле tours, то используем его
      if (data.tours && typeof data.tours === 'object') {
        data = data.tours;
      }
      // Если data содержит поле id, удалим его (это лишний ключ)
      if (data.id) {
        delete data.id;
      }
      // Теперь data должен быть объектом с ключами tour1, tour2, ...
      if (typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        tours = keys.map(key => {
          const tour = data[key];
          if (tour && typeof tour === 'object') {
            if (!tour.date) {
              console.warn('Тур без даты (пропускаем):', tour);
              return null;
            }
            return { id: tour.id || key, ...tour };
          } else {
            console.warn('Некорректный тур по ключу', key, tour);
            return null;
          }
        }).filter(t => t !== null);
      } else if (Array.isArray(data)) {
        tours = data;
      } else {
        tours = [];
      }
      console.log('📋 Массив туров после обработки:', tours);
      
      toursByDate = tours.reduce((acc, tour) => {
        const date = tour.date;
        if (!date) {
          console.warn('Тур без даты (пропускаем):', tour);
          return acc;
        }
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

// --- Отрисовка календаря ---
function renderCalendar() {
  if (!monthYear || !daysGrid) {
    console.error('Элементы календаря не найдены');
    return;
  }
  console.log('🔄 Рендерим календарь для', currentMonth, currentYear);
  
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  daysGrid.innerHTML = '';

  // Дни недели
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
          selectedDate = d;
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

// --- Показать туры для выбранной даты ---
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
        selectedTour = tour;
        showBookingForm(tour);
      });
    }
    toursList.appendChild(card);
  });
  showScreen('toursScreen');
}

// --- Показать форму бронирования ---
function showBookingForm(tour) {
  if (tourInfo) tourInfo.textContent = `${tour.route}, ${tour.date} в ${tour.time}`;
  if (tourIdInput) tourIdInput.value = tour.id;
  if (maxSpotsInput) maxSpotsInput.value = tour.maxSpots;
  if (pricePerBoardInput) pricePerBoardInput.value = tour.pricePerBoard;
  if (boardsInput) {
    boardsInput.max = tour.maxSpots - (tour.booked || 0);
    boardsInput.value = 1;
  }
  if (statusDiv) {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }
  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';
  if (commentInput) commentInput.value = '';
  showScreen('bookingForm');
}

// --- Отправка бронирования ---
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const boards = boardsInput ? parseInt(boardsInput.value, 10) : 1;
    const comment = commentInput ? commentInput.value.trim() : '';
    const tourId = tourIdInput ? tourIdInput.value : '';

    if (!name || !phone) {
      if (statusDiv) {
        statusDiv.textContent = '⚠️ Имя и телефон обязательны';
        statusDiv.className = 'error';
      }
      return;
    }
    if (boards < 1) {
      if (statusDiv) {
        statusDiv.textContent = '⚠️ Выберите хотя бы 1 сап';
        statusDiv.className = 'error';
      }
      return;
    }

    const tour = tours.find(t => t.id === tourId);
    if (!tour) {
      if (statusDiv) {
        statusDiv.textContent = '❌ Тур не найден';
        statusDiv.className = 'error';
      }
      return;
    }
    const available = tour.maxSpots - (tour.booked || 0);
    if (boards > available) {
      if (statusDiv) {
        statusDiv.textContent = `❌ Доступно только ${available} мест`;
        statusDiv.className = 'error';
      }
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

        if (statusDiv) {
          statusDiv.textContent = '✅ Бронирование успешно создано!';
          statusDiv.className = 'success';
        }
        form.reset();
        showConfirmation(bookingData);
      })
      .catch(err => {
        console.error('Ошибка сохранения:', err);
        if (statusDiv) {
          statusDiv.textContent = '❌ Ошибка при сохранении. Попробуйте позже.';
          statusDiv.className = 'error';
        }
      });
  });
}

// --- Экран подтверждения с деталями маршрута ---
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

// --- Кнопка "Выбрать свою прогулку" ---
if (chooseTourBtn) {
  chooseTourBtn.addEventListener('click', function() {
    console.log('🖱️ Кнопка "Выбрать свою прогулку" нажата');
    showScreen('calendarScreen');
    loadTours();
  });
} else {
  console.warn('Кнопка #chooseTourBtn не найдена');
}

// --- Приветствие с именем пользователя ---
if (currentUser && currentUser.first_name && greetingMessage) {
  greetingMessage.textContent = `👋 Привет, ${currentUser.first_name}!`;
}

// --- Инициализация ---
showScreen('greetingScreen');