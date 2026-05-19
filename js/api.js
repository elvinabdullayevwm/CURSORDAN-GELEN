/**
 * Yolasal - Google Apps Script API
 */

function getScriptUrl() {
  return (typeof YOLASAL_CONFIG !== 'undefined' && YOLASAL_CONFIG.SCRIPT_URL)
    ? YOLASAL_CONFIG.SCRIPT_URL
    : '';
}

async function apiPost(payload) {
  const url = getScriptUrl();
  if (!url) throw new Error('SCRIPT_URL təyin edilməyib (js/config.js)');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Server cavabı JSON deyil: ' + text);
  }
}

async function apiGet(params) {
  const url = getScriptUrl();
  if (!url) throw new Error('SCRIPT_URL təyin edilməyib (js/config.js)');

  const qs = new URLSearchParams(params).toString();
  const response = await fetch(`${url}?${qs}`);
  const text = await response.text();
  return JSON.parse(text);
}

async function apiCheckUser(email, phone) {
  return apiGet({ action: 'checkUser', email, phone });
}

async function apiSendOtp(email) {
  return apiPost({ action: 'sendOtp', email });
}

async function apiRegisterUser(userData) {
  return apiPost({ action: 'registerUser', ...userData });
}

async function apiLogin(loginId, password) {
  return apiPost({ action: 'login', loginId, password });
}

async function apiNewOrder(orderData, customerID) {
  return apiPost({
    action: 'createNewOrder',
    customerID: String(customerID),
    data: orderData
  });
}

async function apiNewRoute(routeData, customerID) {
  return apiPost({
    action: 'createNewRoute',
    customerID: String(customerID),
    data: routeData
  });
}

async function apiGetPublicOrders() {
  return apiPost({ action: 'getPublicOrders' });
}

async function apiGetPublicRoutes() {
  return apiPost({ action: 'getPublicRoutes' });
}

async function apiGetMyOrders(customerID) {
  return apiPost({ action: 'getMyOrders', customerID: String(customerID) });
}

async function apiGetMyRoutes(customerID) {
  return apiPost({ action: 'getMyRoutes', customerID: String(customerID) });
}

async function apiGetStats() {
  return apiPost({ action: 'getStats' });
}

async function apiTrack(trackId) {
  return apiPost({ action: 'track', trackId });
}
