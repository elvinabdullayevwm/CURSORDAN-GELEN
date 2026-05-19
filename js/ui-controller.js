/**
 * Yolasal - UI Controller
 */

const AZ_CITIES = [
  'Bakı', 'Sumqayıt', 'Gəncə™', 'Mingəçevir', 'Xırdalan', 'Şirvan', 'Naxçıvan', 'Lənkəran',
  'Yevlax', 'Şəki', 'Quba', 'Xaçmaz', 'Qusar', 'Şamaxı', 'İsmayıllı', 'Göyçay', 'Bərdə',
  'Tərtər', 'Ağdam', 'Füzuli', 'Cəlilabad', 'Salyan', 'Masallı', 'Şəmkir', 'Tovuz', 'Qazax',
  'Zaqatala', 'Balakən', 'Qəbələ™', 'Saatlı', 'Sabirabad', 'İmişli', 'Neftçala', 'Astara'
].sort((a, b) => a.localeCompare(b, 'az'));

let tempUserData = {};

// --- Sessiya ---
function saveSession(user) {
  localStorage.setItem('yolasal_session', JSON.stringify(user));
}

function getSession() {
  try {
    const raw = localStorage.getItem('yolasal_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('yolasal_session');
}

function applyLoggedInUI(user) {
  document.getElementById('dashUserName').innerText = `${user.name} ${user.surname}`;
  document.getElementById('dashUserId').innerText = user.id;
  document.getElementById('dashUserMmc').innerText = user.mmc || 'Şəxsi Hesab';
  document.getElementById('dashUserPhone').innerText = user.phone || '-';

  const mainLoginBtn = document.getElementById('loginBtn');
  const userProfileArea = document.getElementById('userProfileArea');
  if (mainLoginBtn) mainLoginBtn.style.display = 'none';
  if (userProfileArea) {
    userProfileArea.style.display = 'inline-block';
    const avatar = document.getElementById('userAvatarBtn');
    if (avatar) avatar.innerText = (user.name || '?').charAt(0).toUpperCase();
  }

  const dashboard = document.getElementById('customerDashboard');
  if (dashboard) dashboard.style.display = 'block';
}

function applyLoggedOutUI() {
  clearSession();
  const dashboard = document.getElementById('customerDashboard');
  if (dashboard) dashboard.style.display = 'none';

  const mainLoginBtn = document.getElementById('loginBtn');
  const userProfileArea = document.getElementById('userProfileArea');
  if (mainLoginBtn) mainLoginBtn.style.display = 'inline-block';
  if (userProfileArea) userProfileArea.style.display = 'none';
}

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  fillCitySelect('citySelect');
  fillCitySelect('orderPickupCity');
  fillCitySelect('orderDropCity');
  fillCitySelect('routePickupCity');
  fillCitySelect('routeDropCity');

  const session = getSession();
  if (session) applyLoggedInUI(session);

  loadMarketplace();
  loadLiveStats();

  const menuToggle = document.getElementById('mobile-menu');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      menuToggle.classList.toggle('is-active');
    });
  }

  document.querySelectorAll('.nav-links li').forEach(link => {
    link.addEventListener('click', (e) => {
      if (e.target.closest('#userProfileArea')) return;
      if (navLinks) navLinks.classList.remove('active');
    });
  });

  document.querySelector('.btn-search')?.addEventListener('click', handleTrackSearch);
  document.getElementById('trackInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleTrackSearch();
  });
});

function fillCitySelect(selectId) {
  const el = document.getElementById(selectId);
  if (!el || el.options.length > 1) return;
  const placeholder = el.querySelector('option[value=""]')?.outerHTML || '<option value="">Seçin *</option>';
  el.innerHTML = placeholder;
  AZ_CITIES.forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    el.appendChild(opt);
  });
}

// --- Login modal ---
const loginModal = document.getElementById('loginModal');

function openLogin() {
  if (loginModal) loginModal.style.display = 'flex';
}

document.getElementById('loginBtn')?.addEventListener('click', openLogin);
document.getElementById('closeLogin')?.addEventListener('click', () => {
  if (loginModal) loginModal.style.display = 'none';
});

document.getElementById('showReg')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginFormArea').style.display = 'none';
  document.getElementById('regFormArea').style.display = 'block';
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('regFormArea').style.display = 'none';
  document.getElementById('otpFormArea').style.display = 'none';
  document.getElementById('loginFormArea').style.display = 'block';
});

// --- Qeydiyyat ---
document.getElementById('startRegBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('regName').value.trim();
  const surname = document.getElementById('regSurname').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPrefix').value + document.getElementById('regPhone').value.trim();
  const city = document.getElementById('citySelect').value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value || '';
  const birth = document.getElementById('regBirth').value;
  const mmc = document.getElementById('regMMC').value.trim();
  const pass = document.getElementById('regPassword').value;

  if (!name || !surname || !email || !phone || !city || !birth || !pass) {
    alert('Zəhmət olmasa bütüb vacib xanaları doldurun(*)!');
    return;
  }

  const btn = document.getElementById('startRegBtn');
  btn.disabled = true;
  btn.innerText = 'Yoxlanılır...';

  try {
    const check = await apiCheckUser(email, phone);
    if (check.exists) {
      alert('Bu e-mail və ya nömrə sistemdə mövcuddur!');
      return;
    }

    const otpRes = await apiSendOtp(email);
    if (otpRes.status !== 'success') {
      alert(otpRes.message || 'OTP göndərilmədi.');
      return;
    }

    tempUserData = { name, surname, email, phone, city, gender, birth, mmc, pass };

    document.getElementById('regFormArea').style.display = 'none';
    document.getElementById('otpFormArea').style.display = 'block';
    alert('Mailinizə təsdiq kodu göndərildi.');
  } catch (err) {
    alert('BaДџlantД± xЙ™tasД±: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Qeydiyyatdan keç';
  }
});

document.getElementById('verifyOtpBtn')?.addEventListener('click', async () => {
  const otp = document.getElementById('otpInput').value.trim();
  if (!otp || otp.length !== 4) {
    alert('4 rəqəmli kodu daxil edin.');
    return;
  }

  const btn = document.getElementById('verifyOtpBtn');
  btn.disabled = true;
  btn.innerText = 'Tamamlanır...';

  try {
    const result = await apiRegisterUser({ ...tempUserData, otp });
    if (result.status !== 'success') {
      alert(result.message || 'Qeydiyyat alınmadı.');
      return;
    }

    alert(`Qeydiyyat tamamlandı: müştəri ID: ${result.user.id}`);
    document.getElementById('otpFormArea').style.display = 'none';
    document.getElementById('loginFormArea').style.display = 'block';
    document.getElementById('loginId').value = result.user.email;
    tempUserData = {};
  } catch (err) {
    alert('XЙ™ta: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'TЖЏSDД°QLЖЏ';
  }
});

// --- Login ---
async function handleLoginProcess() {
  const loginId = document.getElementById('loginId').value.trim();
  const loginPass = document.getElementById('loginPass').value;
  const submitBtn = document.getElementById('submitLoginBtn');

  if (!loginId || !loginPass) {
    alert('Bütün xanaları doldurun!');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = 'Yoxlanılır...';

  try {
    const result = await apiLogin(loginId, loginPass);
    if (result.status !== 'Success') {
      alert(result.message || 'Giriş uğursuz.');
      return;
    }

    const user = {
      id: result.id,
      name: result.name,
      surname: result.surname,
      email: result.email,
      phone: result.phone,
      mmc: result.mmc
    };
    saveSession(user);
    applyLoggedInUI(user);

    if (loginModal) loginModal.style.display = 'none';
    document.getElementById('loginId').value = '';
    document.getElementById('loginPass').value = '';
    scrollToSection('customerDashboard');
    loadMarketplace();
    loadLiveStats();
  } catch (err) {
    alert('Giriş xətası: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'DAXİL OL';
  }
}

function toggleUserDropdown(event) {
  event.stopPropagation();
  const menu = document.getElementById('userDropdownMenu');
  if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function openSettings(event) {
  if (event) event.preventDefault();
  alert('Ayarlar bölməsi tezliklə aktiv olacaq.');
  const menu = document.getElementById('userDropdownMenu');
  if (menu) menu.style.display = 'none';
}

function logoutUser(event) {
  if (event) event.preventDefault();
  if (!confirm('Çıxmaq istədiyinizə əminsiniz?')) return;
  applyLoggedOutUI();
  scrollToSection('home');
}

// --- Dashboard ---
function handleDashboardAction(actionType) {
  const session = getSession();
  if (!session && actionType !== 'browse-marketplace') {
    alert('ЖЏvvЙ™lcЙ™ daxil olun.');
    openLogin();
    return;
  }

  switch (actionType) {
    case 'new-order':
      openNewOrderModal();
      break;
    case 'new-route':
      openNewRouteModal();
      break;
    case 'active-orders':
      showMyListModal('Aktiv sifarişlərim', 'orders', 'Aktiv');
      break;
    case 'in-progress-orders':
      showMyListModal('İcrada olan sifarişlərim', 'orders', 'İcrada');
      break;
    case 'delivered-orders':
      showMyListModal('Təslim edilən sifarişlərim', 'orders', 'Təslimm edildi');
      break;
    case 'active-routes':
      showMyListModal('Aktiv reyslərim', 'routes', 'Aktiv');
      break;
    case 'in-progress-routes':
      showMyListModal('İcrada olan reyslərim', 'routes', 'İcrada');
      break;
    case 'completed-routes':
      showMyListModal('Tamamlanmış reyslərim', 'routes', 'Tamamlandı');
      break;
    case 'search-orders':
    case 'search-routes':
      scrollToSection('marketplace-section');
      break;
    default:
      scrollToSection('marketplace-section');
  }
}

// --- SifariЕџ modal ---
function openNewOrderModal() {
  const modal = document.getElementById('newOrderModal');
  if (modal) modal.style.display = 'block';
}

function closeNewOrderModal() {
  const modal = document.getElementById('newOrderModal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('newOrderForm')?.reset();
  }
}

function submitNewOrder(event) {
  event.preventDefault();
  const session = getSession();
  if (!session) {
    alert('Sifariş üçün daxil olun.');
    openLogin();
    return;
  }

  const submitBtn = document.getElementById('submitOrderBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Göndərilir...';

  const orderData = {
    goodType: document.getElementById('orderGoodType').value,
    goodName: document.getElementById('orderGoodName').value,
    material: document.getElementById('orderMaterial').value,
    fragility: document.getElementById('orderFragility').value,
    weight: `${document.getElementById('orderWeightVal').value} ${document.getElementById('orderWeightUnit').value}`,
    width: `${document.getElementById('orderWidthVal').value} ${document.getElementById('orderWidthUnit').value}`,
    length: `${document.getElementById('orderLengthVal').value} ${document.getElementById('orderLengthUnit').value}`,
    height: `${document.getElementById('orderHeightVal').value} ${document.getElementById('orderHeightUnit').value}`,
    pickupCity: document.getElementById('orderPickupCity').value,
    pickupAddress: document.getElementById('orderPickupAddress').value,
    dropCity: document.getElementById('orderDropCity').value,
    dropAddress: document.getElementById('orderDropAddress').value,
    pickupDate: document.getElementById('orderPickupDate').value,
    dropDate: document.getElementById('orderDropDate').value,
    budget: `${document.getElementById('orderBudgetVal').value} ${document.getElementById('orderBudgetCurrency').value}`,
    notes: document.getElementById('orderNotes').value || '-'
  };

  apiNewOrder(orderData, session.id)
    .then(res => {
      if (res.status === 'success') {
        alert(`Sifariş yaradıldı: ${res.orderID}`);
        closeNewOrderModal();
        loadMarketplace();
        loadLiveStats();
      } else {
        alert(res.message || 'Xəta');
      }
    })
    .catch(err => alert('Xəta: ' + err.message))
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'SİFARİŞİ TƏSDİQLƏ VƏ PAYLAŞ';
    });
}

// --- Reys modal ---
function openNewRouteModal() {
  const modal = document.getElementById('newRouteModal');
  if (modal) modal.style.display = 'block';
}

function closeNewRouteModal() {
  const modal = document.getElementById('newRouteModal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('newRouteForm')?.reset();
  }
}

function submitNewRoute(event) {
  event.preventDefault();
  const session = getSession();
  if (!session) {
    alert('Reys üçün daxil olun.');
    openLogin();
    return;
  }

  const submitBtn = document.getElementById('submitRouteBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Göndərilir...';

  const routeData = {
    vehicleType: document.getElementById('routeVehicleType').value,
    capacity: `${document.getElementById('routeCapacityVal').value} ${document.getElementById('routeCapacityUnit').value}`,
    pickupCity: document.getElementById('routePickupCity').value,
    pickupAddress: document.getElementById('routePickupAddress').value,
    dropCity: document.getElementById('routeDropCity').value,
    dropAddress: document.getElementById('routeDropAddress').value,
    departureDate: document.getElementById('routeDepartureDate').value,
    availableDate: document.getElementById('routeAvailableDate').value,
    price: `${document.getElementById('routePriceVal').value} ${document.getElementById('routePriceCurrency').value}`,
    notes: document.getElementById('routeNotes').value || '-'
  };

  apiNewRoute(routeData, session.id)
    .then(res => {
      if (res.status === 'success') {
        alert(`Reys yaradıldı: ${res.routeID}`);
        closeNewRouteModal();
        loadMarketplace();
        loadLiveStats();
      } else {
        alert(res.message || 'Xəta');
      }
    })
    .catch(err => alert('Xəta: ' + err.message))
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'REYSİ TƏSDİQLƏ VƏ PAYLAŞ';
    });
}

// --- Marketplace (hamı görür) ---
async function loadMarketplace() {
  const ordersEl = document.getElementById('marketplaceOrders');
  const routesEl = document.getElementById('marketplaceRoutes');
  if (!ordersEl || !routesEl) return;

  ordersEl.innerHTML = '<p class="mp-loading">Yüklənir...</p>';
  routesEl.innerHTML = '<p class="mp-loading">Yüklənir...</p>';

  try {
    const [ordersRes, routesRes] = await Promise.all([
      apiGetPublicOrders(),
      apiGetPublicRoutes()
    ]);

    ordersEl.innerHTML = renderOrdersList(ordersRes.orders || []);
    routesEl.innerHTML = renderRoutesList(routesRes.routes || []);
  } catch (err) {
    ordersEl.innerHTML = `<p class="mp-error">Xəta: ${err.message}</p>`;
    routesEl.innerHTML = `<p class="mp-error">Xəta: ${err.message}</p>`;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderOrdersList(orders) {
  if (!orders.length) return '<p class="mp-empty">Hələ sifariş yoxdur.</p>';
  return orders.map(o => `
    <div class="mp-card">
      <div class="mp-card-head"><b>${escapeHtml(o.orderId)}</b> <span class="mp-status">${escapeHtml(o.status)}</span></div>
      <p>${escapeHtml(o.pickupCity)} → ${escapeHtml(o.dropCity)}</p>
      <p class="mp-meta">${escapeHtml(o.goodName)} · ${escapeHtml(o.budget)} · Müştəri: ${escapeHtml(o.customerId)}</p>
    </div>
  `).join('');
}

function renderRoutesList(routes) {
  if (!routes.length) return '<p class="mp-empty">Hələ reys yoxdur.</p>';
  return routes.map(r => `
    <div class="mp-card">
      <div class="mp-card-head"><b>${escapeHtml(r.routeId)}</b> <span class="mp-status">${escapeHtml(r.status)}</span></div>
      <p>${escapeHtml(r.pickupCity)} → ${escapeHtml(r.dropCity)}</p>
      <p class="mp-meta">${escapeHtml(r.vehicleType)} · ${escapeHtml(r.price)} · ID: ${escapeHtml(r.customerId)}</p>
    </div>
  `).join('');
}

async function loadLiveStats() {
  try {
    const res = await apiGetStats();
    if (res.status !== 'success') return;
    const o = res.orders || {};
    const r = res.routes || {};
    setStatNum('stat-active-orders', o.active);
    setStatNum('stat-active-routes', r.active);
    setStatNum('stat-progress-orders', o.inProgress);
    setStatNum('stat-progress-routes', r.inProgress);
    setStatNum('stat-delivered', (o.delivered || 0) + (r.completed || 0));
  } catch { /* ignore */ }
}

function setStatNum(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.textContent = val;
}

async function showMyListModal(title, type, statusFilter) {
  const session = getSession();
  if (!session) return;
  const modal = document.getElementById('activityModal');
  const titleEl = document.getElementById('modalTitle');
  const dataDiv = document.getElementById('modalData');
  if (!modal) return;
  modal.style.display = 'flex';
  titleEl.innerText = title;
  dataDiv.innerHTML = '<p style="padding:20px;text-align:center;">Yüklənir...</p>';
  try {
    const res = type === 'orders' ? await apiGetMyOrders(session.id) : await apiGetMyRoutes(session.id);
    const items = (type === 'orders' ? res.orders : res.routes) || [];
    const filtered = statusFilter ? items.filter(i => (i.status || '') === statusFilter) : items;
    if (!filtered.length) {
      dataDiv.innerHTML = '<p style="padding:20px;text-align:center;">Məlumat tapılmadı.</p>';
      return;
    }
    dataDiv.innerHTML = filtered.map(item => {
      if (type === 'orders') {
        return `<div class="list-row"><b>${escapeHtml(item.orderId)}</b> — ${escapeHtml(item.pickupCity)} → ${escapeHtml(item.dropCity)} <em>(${escapeHtml(item.status)})</em></div>`;
      }
      return `<div class="list-row"><b>${escapeHtml(item.routeId)}</b> — ${escapeHtml(item.pickupCity)} → ${escapeHtml(item.dropCity)} <em>(${escapeHtml(item.status)})</em></div>`;
    }).join('');
  } catch (err) {
    dataDiv.innerHTML = `<p style="padding:20px;color:red;">${escapeHtml(err.message)}</p>`;
  }
}

async function handleTrackSearch() {
  const id = document.getElementById('trackInput')?.value.trim();
  if (!id) { alert('İzləmə nömrəsini yazın (məs: 650001/O0001)'); return; }
  try {
    const res = await apiTrack(id);
    if (res.status !== 'success') { alert(res.message || 'Tapılmadı'); return; }
    const item = res.item;
    const label = res.type === 'order' ? 'Sifariş' : 'Reys';
    const itemId = res.type === 'order' ? item.orderId : item.routeId;
    alert(`${label}: ${itemId}\nStatus: ${item.status}\n${item.pickupCity} → ${item.dropCity}`);
  } catch (err) { alert('Xəta: ' + err.message); }
}

function scrollToSection(id) {
  const element = document.getElementById(id);
  if (!element) return;
  const offset = 90;
  const bodyRect = document.body.getBoundingClientRect().top;
  const elementRect = element.getBoundingClientRect().top;
  window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
}

async function showLiveDetails(type) {
  const modal = document.getElementById('activityModal');
  const title = document.getElementById('modalTitle');
  const dataDiv = document.getElementById('modalData');
  if (!modal) return;
  modal.style.display = 'flex';
  title.innerText = type.replace(/-/g, ' ').toUpperCase();
  dataDiv.innerHTML = '<p style="padding:20px;text-align:center;">Yüklənir...</p>';
  try {
    const [ordersRes, routesRes] = await Promise.all([apiGetPublicOrders(), apiGetPublicRoutes()]);
    const orders = ordersRes.orders || [];
    const routes = routesRes.routes || [];
    let html = '';
    if (type.includes('sifaris')) {
      const filtered = type.includes('aktiv') ? orders.filter(o => o.status === 'Aktiv') : type.includes('icra') ? orders.filter(o => o.status === 'İcrada') : orders;
      html = filtered.slice(0, 20).map(o => `<div class="list-row"><b>${escapeHtml(o.orderId)}</b> ${escapeHtml(o.pickupCity)} → ${escapeHtml(o.dropCity)}</div>`).join('') || '<p>Sifariş yoxdur.</p>';
    } else {
      const filtered = type.includes('aktiv') ? routes.filter(r => r.status === 'Aktiv') : type.includes('icra') ? routes.filter(r => r.status === 'İcrada') : routes;
      html = filtered.slice(0, 20).map(r => `<div class="list-row"><b>${escapeHtml(r.routeId)}</b> ${escapeHtml(r.pickupCity)} → ${escapeHtml(r.dropCity)}</div>`).join('') || '<p>Reys yoxdur.</p>';
    }
    dataDiv.innerHTML = html;
  } catch (err) { dataDiv.innerHTML = `<p style="padding:20px;">${escapeHtml(err.message)}</p>`; }
}

function closeActivityModal() {
  const actModal = document.getElementById('activityModal');
  if (actModal) actModal.style.display = 'none';
}

window.onclick = function (event) {
  if (event.target === loginModal) loginModal.style.display = 'none';
  if (event.target === document.getElementById('activityModal')) closeActivityModal();
  if (event.target === document.getElementById('newOrderModal')) closeNewOrderModal();
  if (event.target === document.getElementById('newRouteModal')) closeNewRouteModal();
  if (!event.target.closest('#userProfileArea')) {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.style.display = 'none';
  }
};
