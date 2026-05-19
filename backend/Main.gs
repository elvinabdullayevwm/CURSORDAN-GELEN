/**
 * Yolasal - Mərkəzi API (doGet / doPost)
 */

function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action;

    if (action === 'checkUser') {
      return jsonResponse(handleCheckUser(params));
    }

    return jsonResponse({ status: 'error', message: 'Naməlum GET əmri: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result;

    switch (action) {
      case 'sendOtp':
        result = handleSendOtp(data);
        break;
      case 'registerUser':
        result = handleRegisterUser(data);
        break;
      case 'login':
        result = handleLogin(data);
        break;
      case 'createNewOrder':
        result = handleCreateNewOrder(data);
        break;
      case 'createNewRoute':
        result = handleCreateNewRoute(data);
        break;
      case 'getPublicOrders':
        result = handleGetPublicOrders();
        break;
      case 'getPublicRoutes':
        result = handleGetPublicRoutes();
        break;
      case 'getMyOrders':
        result = handleGetMyOrders(data);
        break;
      case 'getMyRoutes':
        result = handleGetMyRoutes(data);
        break;
      case 'getStats':
        result = handleGetStats();
        break;
      case 'track':
        result = handleTrack(data);
        break;
      default:
        result = { status: 'error', message: 'Naməlum POST əmri: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Backend xətası: ' + err.toString() });
  }
}

/**
 * İlk qurulum: Google Sheet-də vərəqləri və başlıqları yaradır.
 * Apps Script redaktorundan bir dəfə işə salın.
 */
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
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
}
