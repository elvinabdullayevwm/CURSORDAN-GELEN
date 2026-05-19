function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(name) {
  var sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error("'" + name + "' adlı vərəq tapılmadı. Google Sheet-də yaradın.");
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
