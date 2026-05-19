/**
 * YOLASAL - BÜTÜN KOD BİR FAYLDA
 * Google Sheet → Extensions → Apps Script → Code.gs məzmununu sil, bunu yapışdır.
 * Sonra: setupSheets işə sal → Deploy Web app
 */

// ========== CONFIG ==========
var SHEET_USERS = 'Users';
var SHEET_ORDERS = 'Orders';
var SHEET_ROUTES = 'Routes';
var OTP_CACHE_PREFIX = 'otp_';
var OTP_TTL_SECONDS = 600;
var ORDER_STATUS_ACTIVE = 'Aktiv';
var ROUTE_STATUS_ACTIVE = 'Aktiv';

// ========== DATABASE ==========
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(name) {
  var sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error("'" + name + "' adlı vərəq tapılmadı. setupSheets işə salın.");
  }
  return sheet;
}

function getSheetData(name) {
  var sheet = getSheet(name);
  var range = sheet.getDataRange();
  if (range.getNumRows() === 0) return [];
  return range.getValues();
}

function appendToSheet(name, row) {
  getSheet(name).appendRow(row);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

// ========== LOGISTICS / ID ==========
function getYearMonthPrefix() {
  var now = new Date();
  var yearDigit = now.getFullYear() % 10;
  var month = now.getMonth() + 1;
  return String(yearDigit) + String(month);
}

function generateCustomerID() {
  var prefix = getYearMonthPrefix();
  var rows = getSheetData(SHEET_USERS);
  var maxSeq = 0;
  for (var i = 1; i < rows.length; i++) {
    var id = String(rows[i][0] || '');
    if (id.indexOf(prefix) !== 0 || id.length < 6) continue;
    var seq = parseInt(id.substring(2), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  var nextSeq = maxSeq + 1;
  return prefix + ('0000' + nextSeq).slice(-4);
}

function generateOrderID(customerId) {
  var rows = getSheetData(SHEET_ORDERS);
  var count = 0;
  var cid = String(customerId);
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === cid) count++;
  }
  var seq = count + 1;
  return cid + '/O' + ('0000' + seq).slice(-4);
}

function generateRouteID(customerId) {
  var rows = getSheetData(SHEET_ROUTES);
  var count = 0;
  var cid = String(customerId);
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === cid) count++;
  }
  var seq = count + 1;
  return cid + '/R' + ('0000' + seq).slice(-4);
}

// ========== AUTH ==========
function hashPassword(password) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password) + ':yolasal_salt_v1'
  );
  return Utilities.base64Encode(raw);
}

function findUserByEmailOrPhone(email, phone) {
  var rows = getSheetData(SHEET_USERS);
  var normEmail = normalizeEmail(email);
  var normPhone = normalizePhone(phone);
  for (var i = 1; i < rows.length; i++) {
    var rowEmail = normalizeEmail(rows[i][3]);
    var rowPhone = normalizePhone(rows[i][4]);
    if (normEmail && rowEmail === normEmail) return { row: rows[i], index: i };
    if (normPhone && rowPhone === normPhone) return { row: rows[i], index: i };
  }
  return null;
}

function findUserByLoginId(loginId) {
  var rows = getSheetData(SHEET_USERS);
  var id = String(loginId || '').trim();
  var normEmail = normalizeEmail(id);
  var normPhone = normalizePhone(id);
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) return rows[i];
    if (normEmail && normalizeEmail(rows[i][3]) === normEmail) return rows[i];
    if (normPhone && normalizePhone(rows[i][4]) === normPhone) return rows[i];
  }
  return null;
}

function userRowToObject(row) {
  return {
    id: String(row[0]),
    name: String(row[1] || ''),
    surname: String(row[2] || ''),
    email: String(row[3] || ''),
    phone: String(row[4] || ''),
    city: String(row[5] || ''),
    gender: String(row[6] || ''),
    birth: row[7] ? String(row[7]) : '',
    mmc: String(row[8] || '')
  };
}

function handleCheckUser(params) {
  var found = findUserByEmailOrPhone(params.email, params.phone);
  return { exists: !!found };
}

function handleSendOtp(data) {
  var email = normalizeEmail(data.email);
  if (!email) return { status: 'error', message: 'E-mail tələb olunur.' };
  if (findUserByEmailOrPhone(email, null)) {
    return { status: 'error', message: 'Bu e-mail artıq qeydiyyatdadır.' };
  }
  var otp = String(Math.floor(1000 + Math.random() * 9000));
  CacheService.getScriptCache().put(OTP_CACHE_PREFIX + email, otp, OTP_TTL_SECONDS);
  try {
    MailApp.sendEmail({
      to: email,
      subject: 'Yolasal - Qeydiyyat təsdiq kodu',
      body: 'Təsdiq kodunuz: ' + otp + '\n\nKod 10 dəqiqə etibarlıdır.'
    });
  } catch (e) {
    return { status: 'error', message: 'Mail göndərilmədi: ' + e.toString() };
  }
  return { status: 'success', message: 'Təsdiq kodu göndərildi.' };
}

function handleRegisterUser(data) {
  var email = normalizeEmail(data.email);
  var phone = normalizePhone(data.phone);
  var otp = String(data.otp || '').trim();
  if (!email || !phone || !data.name || !data.surname || !data.pass) {
    return { status: 'error', message: 'Bütün vacib xanaları doldurun.' };
  }
  var cache = CacheService.getScriptCache();
  var cachedOtp = cache.get(OTP_CACHE_PREFIX + email);
  if (!cachedOtp || cachedOtp !== otp) {
    return { status: 'error', message: 'Təsdiq kodu yanlışdır və ya vaxtı bitib.' };
  }
  if (findUserByEmailOrPhone(email, phone)) {
    return { status: 'error', message: 'Bu e-mail və ya nömrə artıq mövcuddur.' };
  }
  var customerId = generateCustomerID();
  appendToSheet(SHEET_USERS, [
    customerId, data.name, data.surname, email, phone,
    data.city || '', data.gender || '', data.birth || '', data.mmc || '',
    hashPassword(data.pass), new Date()
  ]);
  cache.remove(OTP_CACHE_PREFIX + email);
  var user = userRowToObject([
    customerId, data.name, data.surname, email, phone,
    data.city, data.gender, data.birth, data.mmc
  ]);
  return { status: 'success', message: 'Qeydiyyat tamamlandı.', user: user };
}

function handleLogin(data) {
  if (!data.loginId || !data.password) {
    return { status: 'error', message: 'ID və şifrə tələb olunur.' };
  }
  var row = findUserByLoginId(data.loginId);
  if (!row) return { status: 'error', message: 'İstifadəçi tapılmadı.' };
  if (String(row[9] || '') !== hashPassword(data.password)) {
    return { status: 'error', message: 'Şifrə yanlışdır.' };
  }
  var user = userRowToObject(row);
  return {
    status: 'Success',
    id: user.id, name: user.name, surname: user.surname,
    email: user.email, phone: user.phone, mmc: user.mmc, city: user.city
  };
}

// ========== ORDERS ==========
function orderRowToObject(row) {
  return {
    customerId: String(row[0] || ''),
    goodType: String(row[1] || ''),
    goodName: String(row[2] || ''),
    material: String(row[3] || ''),
    fragility: String(row[4] || ''),
    weight: String(row[5] || ''),
    width: String(row[6] || ''),
    length: String(row[7] || ''),
    height: String(row[8] || ''),
    pickupCity: String(row[9] || ''),
    pickupAddress: String(row[10] || ''),
    dropCity: String(row[11] || ''),
    dropAddress: String(row[12] || ''),
    pickupDate: row[13] ? String(row[13]) : '',
    dropDate: row[14] ? String(row[14]) : '',
    budget: String(row[15] || ''),
    status: String(row[16] || ''),
    notes: String(row[17] || ''),
    orderId: String(row[18] || '')
  };
}

function handleCreateNewOrder(request) {
  try {
    var customerID = String(request.customerID || '');
    var data = request.data || {};
    if (!customerID) return { status: 'error', message: 'Müştəri ID tələb olunur.' };
    var orderID = generateOrderID(customerID);
    appendToSheet(SHEET_ORDERS, [
      customerID,
      data.goodType || '', data.goodName || '', data.material || '', data.fragility || '',
      data.weight || '', data.width || '', data.length || '', data.height || '',
      data.pickupCity || '', data.pickupAddress || '', data.dropCity || '', data.dropAddress || '',
      data.pickupDate || '', data.dropDate || '', data.budget || '',
      ORDER_STATUS_ACTIVE, data.notes ? data.notes : '-', orderID
    ]);
    return { status: 'success', message: 'Sifariş yadda saxlanıldı.', orderID: orderID };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getOrdersFiltered(statusFilter, customerIdFilter) {
  var rows = getSheetData(SHEET_ORDERS);
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var item = orderRowToObject(rows[i]);
    if (statusFilter && item.status !== statusFilter) continue;
    if (customerIdFilter && item.customerId !== String(customerIdFilter)) continue;
    list.push(item);
  }
  list.reverse();
  return list;
}

function handleGetPublicOrders() {
  return { status: 'success', orders: getOrdersFiltered(null, null) };
}

function handleGetMyOrders(data) {
  var customerId = String(data.customerID || '');
  if (!customerId) return { status: 'error', message: 'Müştəri ID tələb olunur.' };
  return { status: 'success', orders: getOrdersFiltered(null, customerId) };
}

function handleTrack(data) {
  var trackId = String(data.trackId || '').trim();
  if (!trackId) return { status: 'error', message: 'İzləmə nömrəsi daxil edin.' };
  if (trackId.indexOf('/O') !== -1) {
    var rows = getSheetData(SHEET_ORDERS);
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][18]) === trackId) {
        return { status: 'success', type: 'order', item: orderRowToObject(rows[i]) };
      }
    }
  }
  if (trackId.indexOf('/R') !== -1) {
    var routeRows = getSheetData(SHEET_ROUTES);
    for (var j = 1; j < routeRows.length; j++) {
      if (String(routeRows[j][1]) === trackId) {
        return { status: 'success', type: 'route', item: routeRowToObject(routeRows[j]) };
      }
    }
  }
  return { status: 'error', message: 'Nömrə tapılmadı.' };
}

function getOrderStats() {
  var rows = getSheetData(SHEET_ORDERS);
  var stats = { active: 0, inProgress: 0, delivered: 0, total: 0 };
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    stats.total++;
    var st = String(rows[i][16] || '');
    if (st === 'Aktiv') stats.active++;
    else if (st === 'İcrada') stats.inProgress++;
    else if (st === 'Təslim edildi' || st === 'Tamamlandı') stats.delivered++;
  }
  return stats;
}

// ========== ROUTES ==========
function routeRowToObject(row) {
  return {
    customerId: String(row[0] || ''),
    routeId: String(row[1] || ''),
    vehicleType: String(row[2] || ''),
    capacity: String(row[3] || ''),
    pickupCity: String(row[4] || ''),
    pickupAddress: String(row[5] || ''),
    dropCity: String(row[6] || ''),
    dropAddress: String(row[7] || ''),
    departureDate: row[8] ? String(row[8]) : '',
    availableDate: row[9] ? String(row[9]) : '',
    price: String(row[10] || ''),
    status: String(row[11] || ''),
    notes: String(row[12] || ''),
    createdAt: row[13] ? String(row[13]) : ''
  };
}

function handleCreateNewRoute(request) {
  try {
    var customerID = String(request.customerID || '');
    var data = request.data || {};
    if (!customerID) return { status: 'error', message: 'Müştəri ID tələb olunur.' };
    var routeID = generateRouteID(customerID);
    appendToSheet(SHEET_ROUTES, [
      customerID, routeID,
      data.vehicleType || '', data.capacity || '',
      data.pickupCity || '', data.pickupAddress || '',
      data.dropCity || '', data.dropAddress || '',
      data.departureDate || '', data.availableDate || '',
      data.price || '', ROUTE_STATUS_ACTIVE,
      data.notes ? data.notes : '-', new Date()
    ]);
    return { status: 'success', message: 'Reys yaradıldı.', routeID: routeID };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getRoutesFiltered(statusFilter, customerIdFilter) {
  var rows = getSheetData(SHEET_ROUTES);
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var item = routeRowToObject(rows[i]);
    if (statusFilter && item.status !== statusFilter) continue;
    if (customerIdFilter && item.customerId !== String(customerIdFilter)) continue;
    list.push(item);
  }
  list.reverse();
  return list;
}

function handleGetPublicRoutes() {
  return { status: 'success', routes: getRoutesFiltered(null, null) };
}

function handleGetMyRoutes(data) {
  var customerId = String(data.customerID || '');
  if (!customerId) return { status: 'error', message: 'Müştəri ID tələb olunur.' };
  return { status: 'success', routes: getRoutesFiltered(null, customerId) };
}

function getRouteStats() {
  var rows = getSheetData(SHEET_ROUTES);
  var stats = { active: 0, inProgress: 0, completed: 0, total: 0 };
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    stats.total++;
    var st = String(rows[i][11] || '');
    if (st === 'Aktiv') stats.active++;
    else if (st === 'İcrada') stats.inProgress++;
    else if (st === 'Tamamlandı') stats.completed++;
  }
  return stats;
}

function handleGetStats() {
  return { status: 'success', orders: getOrderStats(), routes: getRouteStats() };
}

// ========== API (doGet / doPost) ==========
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    if (params.action === 'checkUser') {
      return jsonResponse(handleCheckUser(params));
    }
    return jsonResponse({ status: 'error', message: 'Naməlum GET: ' + params.action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var result;
    switch (data.action) {
      case 'sendOtp': result = handleSendOtp(data); break;
      case 'registerUser': result = handleRegisterUser(data); break;
      case 'login': result = handleLogin(data); break;
      case 'createNewOrder': result = handleCreateNewOrder(data); break;
      case 'createNewRoute': result = handleCreateNewRoute(data); break;
      case 'getPublicOrders': result = handleGetPublicOrders(); break;
      case 'getPublicRoutes': result = handleGetPublicRoutes(); break;
      case 'getMyOrders': result = handleGetMyOrders(data); break;
      case 'getMyRoutes': result = handleGetMyRoutes(data); break;
      case 'getStats': result = handleGetStats(); break;
      case 'track': result = handleTrack(data); break;
      default: result = { status: 'error', message: 'Naməlum POST: ' + data.action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ========== İLK QURAŞDIRMA (bir dəfə işə sal) ==========
function setupSheets() {
  var ss = getSpreadsheet();
  ensureSheetWithHeaders(ss, SHEET_USERS, [
    'Müştəri ID', 'Ad', 'Soyad', 'Email', 'Telefon', 'Şəhər', 'Cins', 'Doğum', 'MMC', 'Şifrə Hash', 'Qeydiyyat tarixi'
  ]);
  ensureSheetWithHeaders(ss, SHEET_ORDERS, [
    'Müştəri ID', 'Malın növü', 'Malın adı', 'Material', 'Həssaslıq', 'Çəki', 'En', 'Uzunluq', 'Hündürlük',
    'Təhvil şəhər', 'Təhvil ünvan', 'Təslim şəhər', 'Təslim ünvan', 'Təhvil tarixi', 'Təslim tarixi',
    'Büdcə', 'Status', 'Qeyd', 'Sifariş ID'
  ]);
  ensureSheetWithHeaders(ss, SHEET_ROUTES, [
    'Müştəri ID', 'Reys ID', 'Nəqliyyat', 'Tutum', 'Haradan şəhər', 'Haradan ünvan',
    'Hara şəhər', 'Hara ünvan', 'Yola çıxma', 'Boşalma tarixi', 'Qiymət', 'Status', 'Qeyd', 'Yaradılma'
  ]);
}

function ensureSheetWithHeaders(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
}
