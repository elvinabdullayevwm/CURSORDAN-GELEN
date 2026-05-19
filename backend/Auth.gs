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
  var email = params.email;
  var phone = params.phone;
  var found = findUserByEmailOrPhone(email, phone);
  return { exists: !!found };
}

function handleSendOtp(data) {
  var email = normalizeEmail(data.email);
  if (!email) {
    return { status: 'error', message: 'E-mail tələb olunur.' };
  }

  if (findUserByEmailOrPhone(email, null)) {
    return { status: 'error', message: 'Bu e-mail artıq qeydiyyatdadır.' };
  }

  var otp = String(Math.floor(1000 + Math.random() * 9000));
  var cache = CacheService.getScriptCache();
  cache.put(OTP_CACHE_PREFIX + email, otp, OTP_TTL_SECONDS);

  try {
    MailApp.sendEmail({
      to: email,
      subject: 'Yolasal - Qeydiyyat təsdiq kodu',
      body: 'Təsdiq kodunuz: ' + otp + '\n\nKod 10 dəqiqə ərzində etibarlıdır.'
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
  var passwordHash = hashPassword(data.pass);
  var now = new Date();

  appendToSheet(SHEET_USERS, [
    customerId,
    data.name,
    data.surname,
    email,
    phone,
    data.city || '',
    data.gender || '',
    data.birth || '',
    data.mmc || '',
    passwordHash,
    now
  ]);

  cache.remove(OTP_CACHE_PREFIX + email);

  var user = userRowToObject([
    customerId, data.name, data.surname, email, phone,
    data.city, data.gender, data.birth, data.mmc
  ]);

  return {
    status: 'success',
    message: 'Qeydiyyat tamamlandı.',
    user: user
  };
}

function handleLogin(data) {
  var loginId = data.loginId;
  var password = data.password;

  if (!loginId || !password) {
    return { status: 'error', message: 'ID və şifrə tələb olunur.' };
  }

  var row = findUserByLoginId(loginId);
  if (!row) {
    return { status: 'error', message: 'İstifadəçi tapılmadı.' };
  }

  var storedHash = String(row[9] || '');
  if (storedHash !== hashPassword(password)) {
    return { status: 'error', message: 'Şifrə yanlışdır.' };
  }

  var user = userRowToObject(row);
  return {
    status: 'Success',
    id: user.id,
    name: user.name,
    surname: user.surname,
    email: user.email,
    phone: user.phone,
    mmc: user.mmc,
    city: user.city
  };
}
