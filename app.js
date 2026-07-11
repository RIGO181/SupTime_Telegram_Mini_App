// app.js
(function() {
  // ========== Получение данных пользователя Telegram ==========
  let userId = null;
  let userName = 'любитель сапсёрфинга';
  let isAdmin = false;

  // Сначала стандартный способ
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    userId = tg.initDataUnsafe?.user?.id;
    userName = tg.initDataUnsafe?.user?.first_name || userName;
    console.log('Telegram WebApp API доступен, userId:', userId);
  }

  // Если не получилось – пробуем извлечь из URL (актуально для браузерной версии)
  if (!userId) {
    console.log('Пытаемся получить userId из URL...');
    const urlParams = new URLSearchParams(window.location.search);
    let initDataStr = urlParams.get('tgWebAppData'); // иногда передаётся так
    if (!initDataStr) {
      // Иногда данные в хеше
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      initDataStr = hashParams.get('tgWebAppData');
    }
    if (initDataStr) {
      try {
        const params = new URLSearchParams(initDataStr);
        const userStr = params.get('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user.id;
          userName = user.first_name || userName;
          console.log('userId извлечён из URL:', userId);
        }
      } catch (e) {
        console.error('Ошибка парсинга initData:', e);
      }
    }
  }

  // ID администраторов (замените на свои)
  const ADMIN_IDS = [611952]; // ваш ID
  isAdmin = ADMIN_IDS.includes(userId);

  // ---------- ОТЛАДОЧНЫЙ БЛОК ----------
  // Показываем окно с диагностикой при загрузке (уберите после тестирования)
  const debugInfo = `
    Telegram API доступен: ${!!tg}
    userId: ${userId}
    userName: ${userName}
    ADMIN_IDS: ${JSON.stringify(ADMIN_IDS)}
    isAdmin: ${isAdmin}
    URL: ${window.location.href}
  `;
  alert('Отладка:\n' + debugInfo);
  console.log(debugInfo);
  // ------------------------------------

  // ========== DOM элементы ==========
  const screens = {
    main: document.getElementById('main-screen'),
    calendar: document.getElementById('calendar-screen'),
    slots: document.getElementById('slots-screen'),
    bookingForm: document.getElementById('booking-form-screen'),
    myBookings: document.getElementById('my-bookings-screen'),
    admin: document.getElementById('admin-screen')
  };

  // ========== Навигация ==========
  function showScreen(screen) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
  }

  // Обработчики кнопок "Назад"
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showScreen(screens.main);
    });
  });

  // ========== Главный экран ==========
  document.getElementById('greeting').textContent = `Привет, ${userName}!`;

  if (isAdmin) {
    document.getElementById('btn-admin').style.display = 'block';
  }

  document.getElementById('btn-book').addEventListener('click', () => {
    showScreen(screens.calendar);
    loadCalendar();
  });

  document.getElementById('btn-my-bookings').addEventListener('click', () => {
    showScreen(screens.myBookings);
    loadMyBookings();
  });

  if (isAdmin) {
    document.getElementById('btn-admin').addEventListener('click', () => {
      showScreen(screens.admin);
      loadAdminSlots();
    });
  }

  // ========== Календарь ==========
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();

  async function loadCalendar() {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';

    const daysOfWeek = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    daysOfWeek.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      calendarDiv.appendChild(dayHeader);
    });

    const scheduleSnap = await db.ref('schedule').once('value');
    const schedule = scheduleSnap.val() || {};
    const datesWithSlots = new Set(Object.keys(schedule));

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startOffset; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day day-empty';
      calendarDiv.appendChild(emptyCell);
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';
      dayCell.textContent = day;

      const date = new Date(currentYear, currentMonth, day);
      if (date < today) {
        dayCell.classList.add('day-unavailable');
      } else if (datesWithSlots.has(dateStr)) {
        dayCell.classList.add('day-available');
        dayCell.addEventListener('click', () => openSlotsForDate(dateStr));
      } else {
        dayCell.classList.add('day-unavailable');
      }

      calendarDiv.appendChild(dayCell);
    }
  }

  function openSlotsForDate(date) {
    selectedDate = date;
    document.getElementById('slots-date').textContent = date;
    showScreen(screens.slots);
    loadSlots(date);
  }

  // ========== Слоты ==========
  let selectedDate = null;
  async function loadSlots(date) {
    const slotsList = document.getElementById('slots-list');
    slotsList.innerHTML = '<p>Загрузка...</p>';

    const [scheduleSnap, bookingsSnap] = await Promise.all([
      db.ref(`schedule/${date}`).once('value'),
      db.ref('bookings').orderByChild('date').equalTo(date).once('value')
    ]);

    const slots = scheduleSnap.val() || {};
    const bookings = bookingsSnap.val() || {};

    const occupied = {};
    for (let id in bookings) {
      const b = bookings[id];
      const time = b.time;
      if (!occupied[time]) occupied[time] = 0;
      occupied[time] += b.boardsCount || 0;
    }

    slotsList.innerHTML = '';
    const times = Object.keys(slots).sort();
    if (times.length === 0) {
      slotsList.innerHTML = '<p>Нет доступных прогулок на эту дату.</p>';
      return;
    }

    times.forEach(time => {
      const slot = slots[time];
      const maxBoards = slot.maxBoards || 14;
      const booked = occupied[time] || 0;
      const free = maxBoards - booked;

      const card = document.createElement('div');
      card.className = 'slot-card';
      card.innerHTML = `
        <div class="slot-time">${time}</div>
        <div class="slot-route">${slot.route}</div>
        <div class="slot-duration">${slot.duration || ''}</div>
        <div class="slot-availability ${free <= 0 ? 'slot-full' : ''}">
          Свободно: ${free} / ${maxBoards}
        </div>
      `;

      if (free > 0) {
        card.addEventListener('click', () => openBookingForm(date, time, slot));
      } else {
        card.style.opacity = '0.6';
      }

      slotsList.appendChild(card);
    });
  }

  // ========== Форма бронирования ==========
  let selectedTime = null;
  let selectedRoute = null;
  let selectedPrice = null;

  function openBookingForm(date, time, slot) {
    selectedDate = date;
    selectedTime = time;
    selectedRoute = slot.route;
    selectedPrice = slot.price || 1700;

    document.getElementById('booking-form').reset();
    document.getElementById('boards-count').value = 1;
    document.getElementById('has-children').checked = false;
    document.getElementById('children-block').style.display = 'none';
    document.getElementById('form-error').textContent = '';
    showScreen(screens.bookingForm);
  }

  document.getElementById('has-children').addEventListener('change', function() {
    document.getElementById('children-block').style.display = this.checked ? 'block' : 'none';
  });

  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const clientName = document.getElementById('client-name').value.trim();
    const clientPhone = document.getElementById('client-phone').value.trim();
    const boardsCount = parseInt(document.getElementById('boards-count').value);
    const hasChildren = document.getElementById('has-children').checked;
    const childCount = hasChildren ? parseInt(document.getElementById('child-count').value) || 0 : 0;
    const comment = document.getElementById('comment').value.trim();

    if (!clientName || !clientPhone) {
      document.getElementById('form-error').textContent = 'Заполните имя и телефон';
      return;
    }
    if (boardsCount < 1 || boardsCount > 14) {
      document.getElementById('form-error').textContent = 'Количество сапов от 1 до 14';
      return;
    }

    const bookingsSnap = await db.ref('bookings')
      .orderByChild('date').equalTo(selectedDate).once('value');
    const bookings = bookingsSnap.val() || {};
    let booked = 0;
    for (let id in bookings) {
      if (bookings[id].time === selectedTime) {
        booked += bookings[id].boardsCount || 0;
      }
    }
    const maxBoards = 14;
    if (booked + boardsCount > maxBoards) {
      document.getElementById('form-error').textContent = `Недостаточно мест. Свободно: ${maxBoards - booked}`;
      return;
    }

    const bookingData = {
      clientName,
      clientPhone,
      date: selectedDate,
      time: selectedTime,
      route: selectedRoute,
      boardsCount,
      price: selectedPrice * boardsCount,
      isChild: hasChildren,
      childCount,
      comment,
      createdBy: userId || null,
      createdAt: Date.now(),
      isReservation: false,
      isPaid: false
    };

    try {
      const newRef = db.ref('bookings').push();
      await newRef.set(bookingData);

      if (userId) {
        await db.ref(`telegramUsers/${userId}`).set({
          phone: clientPhone,
          name: clientName
        });
      }

      const clientRef = db.ref(`clients/${clientPhone}`);
      const clientSnap = await clientRef.once('value');
      const clientData = clientSnap.val() || {};
      const totalVisits = (clientData.totalVisits || 0) + 1;
      const totalPaid = (clientData.totalPaid || 0) + (selectedPrice * boardsCount);
      await clientRef.update({
        phone: clientPhone,
        name: clientName,
        totalVisits,
        totalPaid,
        color: clientData.color || ''
      });

      alert('Бронирование успешно!');
      showScreen(screens.main);
    } catch (error) {
      document.getElementById('form-error').textContent = 'Ошибка сохранения: ' + error.message;
    }
  });

  // ========== Мои прогулки ==========
  async function loadMyBookings() {
    if (!userId) {
      document.getElementById('bookings-upcoming').innerHTML = '<p>Не удалось определить пользователя.</p>';
      return;
    }

    const userSnap = await db.ref(`telegramUsers/${userId}`).once('value');
    const userData = userSnap.val();
    const phone = userData?.phone;
    if (!phone) {
      document.getElementById('bookings-upcoming').innerHTML = '<p>У вас пока нет бронирований.</p>';
      return;
    }

    const bookingsSnap = await db.ref('bookings')
      .orderByChild('clientPhone').equalTo(phone).once('value');
    const bookings = bookingsSnap.val() || {};

    const now = new Date();
    const upcoming = [];
    const past = [];

    for (let id in bookings) {
      const b = bookings[id];
      const bookingTime = new Date(`${b.date}T${b.time}:00`);
      if (bookingTime > now) {
        upcoming.push({ id, ...b });
      } else {
        past.push({ id, ...b });
      }
    }

    upcoming.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    past.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    renderBookingsList('bookings-upcoming', upcoming, true);
    renderBookingsList('bookings-past', past, false);
  }

  function renderBookingsList(containerId, bookings, showCancel) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (bookings.length === 0) {
      container.innerHTML = '<p>Нет прогулок</p>';
      return;
    }

    bookings.forEach(b => {
      const item = document.createElement('div');
      item.className = 'booking-item';
      const canCancel = showCancel && (new Date(`${b.date}T${b.time}:00`) - Date.now() > 24 * 60 * 60 * 1000);
      item.innerHTML = `
        <div class="booking-info">
          <div class="booking-date">${b.date} в ${b.time}</div>
          <div class="booking-route">${b.route}</div>
          <div class="booking-details">Сапов: ${b.boardsCount} | ${b.isChild ? 'Детей: '+b.childCount : ''} | ${b.price} руб.</div>
        </div>
        ${canCancel ? '<button class="cancel-btn">Отменить</button>' : ''}
      `;
      if (canCancel) {
        item.querySelector('.cancel-btn').addEventListener('click', () => cancelBooking(b.id));
      }
      container.appendChild(item);
    });
  }

  async function cancelBooking(bookingId) {
    if (!confirm('Вы уверены, что хотите отменить бронирование?')) return;
    try {
      const bookingRef = db.ref(`bookings/${bookingId}`);
      const bookingSnap = await bookingRef.once('value');
      const booking = bookingSnap.val();
      if (!booking) return;

      await bookingRef.remove();

      const phone = booking.clientPhone;
      const clientRef = db.ref(`clients/${phone}`);
      const clientSnap = await clientRef.once('value');
      const clientData = clientSnap.val() || {};
      const newTotalVisits = Math.max((clientData.totalVisits || 1) - 1, 0);
      const newTotalPaid = Math.max((clientData.totalPaid || 0) - (booking.price || 0), 0);
      await clientRef.update({
        totalVisits: newTotalVisits,
        totalPaid: newTotalPaid
      });

      alert('Бронирование отменено');
      loadMyBookings();
    } catch (error) {
      alert('Ошибка отмены: ' + error.message);
    }
  }

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      const tabName = this.dataset.tab;
      document.getElementById('bookings-upcoming').style.display = tabName === 'upcoming' ? 'block' : 'none';
      document.getElementById('bookings-past').style.display = tabName === 'past' ? 'block' : 'none';
    });
  });

  // ========== Админ-панель ==========
  async function loadAdminSlots() {
    const container = document.getElementById('admin-slots-list');
    container.innerHTML = '<p>Загрузка расписания...</p>';

    const scheduleSnap = await db.ref('schedule').once('value');
    const schedule = scheduleSnap.val() || {};

    container.innerHTML = '';
    const dates = Object.keys(schedule).sort();
    for (const date of dates) {
      const times = Object.keys(schedule[date]).sort();
      for (const time of times) {
        const slot = schedule[date][time];
        const item = document.createElement('div');
        item.className = 'slot-item';
        item.innerHTML = `
          <div>
            <strong>${date} ${time}</strong> - ${slot.route}<br>
            <small>Цена: ${slot.price} руб., Длит: ${slot.duration || ''}</small>
          </div>
          <button class="delete-slot-btn" data-date="${date}" data-time="${time}">Удалить</button>
        `;
        item.querySelector('.delete-slot-btn').addEventListener('click', (e) => {
          const date = e.target.dataset.date;
          const time = e.target.dataset.time;
          db.ref(`schedule/${date}/${time}`).remove()
            .then(() => loadAdminSlots());
        });
        container.appendChild(item);
      }
    }
  }

  document.getElementById('btn-add-slot').addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Добавить слот';
    document.getElementById('slot-date').value = '';
    document.getElementById('slot-time').value = '';
    document.getElementById('slot-price').value = 1700;
    document.getElementById('slot-error').textContent = '';
    loadRoutesSelect();
    document.getElementById('slot-modal').style.display = 'flex';
  });

  async function loadRoutesSelect() {
    const select = document.getElementById('slot-route');
    select.innerHTML = '';
    const snap = await db.ref('routes').once('value');
    const routes = snap.val() || {};
    for (let id in routes) {
      const option = document.createElement('option');
      option.value = routes[id].name;
      option.textContent = routes[id].name;
      select.appendChild(option);
    }
  }

  document.querySelector('.modal .close').addEventListener('click', () => {
    document.getElementById('slot-modal').style.display = 'none';
  });

  document.getElementById('btn-save-slot').addEventListener('click', async () => {
    const date = document.getElementById('slot-date').value;
    const time = document.getElementById('slot-time').value;
    const route = document.getElementById('slot-route').value;
    const duration = document.getElementById('slot-duration').value;
    const price = parseInt(document.getElementById('slot-price').value) || 1700;

    if (!date || !time || !route) {
      document.getElementById('slot-error').textContent = 'Заполните все поля';
      return;
    }

    try {
      await db.ref(`schedule/${date}/${time}`).set({
        route,
        duration,
        price,
        maxBoards: 14
      });
      document.getElementById('slot-modal').style.display = 'none';
      loadAdminSlots();
    } catch (error) {
      document.getElementById('slot-error').textContent = 'Ошибка: ' + error.message;
    }
  });

  document.getElementById('btn-view-bookings').addEventListener('click', async () => {
    const container = document.getElementById('admin-bookings-list');
    container.style.display = 'block';
    container.innerHTML = '<p>Загрузка...</p>';

    const bookingsSnap = await db.ref('bookings').once('value');
    const bookings = bookingsSnap.val() || {};
    container.innerHTML = '<h4>Все бронирования</h4>';
    for (let id in bookings) {
      const b = bookings[id];
      const div = document.createElement('div');
      div.textContent = `${b.date} ${b.time} - ${b.clientName} (${b.clientPhone}), сапов: ${b.boardsCount}`;
      container.appendChild(div);
    }
  });
})();