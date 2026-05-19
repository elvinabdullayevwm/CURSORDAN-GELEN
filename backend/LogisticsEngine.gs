/**
 * ID generasiyası: 650001 (il+ay+sıra), 650001/O0001, 650001/R0001
 */

function getYearMonthPrefix() {
  var now = new Date();
  var yearDigit = now.getFullYear() % 10;
  var month = now.getMonth() + 1;
  return String(yearDigit) + String(month);
}

/**
 * Yeni müştəri ID: 650001, 650002 ...
 */
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

/**
 * Sifariş ID: 650001/O0001
 */
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

/**
 * Reys ID: 650001/R0001
 */
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
