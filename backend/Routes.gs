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

    if (!customerID) {
      return { status: 'error', message: 'Müştəri ID tələb olunur.' };
    }

    var routeID = generateRouteID(customerID);
    var status = ROUTE_STATUS_ACTIVE;
    var notes = data.notes ? data.notes : '-';

    var rowData = [
      customerID,
      routeID,
      data.vehicleType || '',
      data.capacity || '',
      data.pickupCity || '',
      data.pickupAddress || '',
      data.dropCity || '',
      data.dropAddress || '',
      data.departureDate || '',
      data.availableDate || '',
      data.price || '',
      status,
      notes,
      new Date()
    ];

    appendToSheet(SHEET_ROUTES, rowData);

    return {
      status: 'success',
      message: 'Reys uğurla yaradıldı.',
      routeID: routeID
    };
  } catch (err) {
    return { status: 'error', message: 'Backend xətası: ' + err.toString() };
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
  if (!customerId) {
    return { status: 'error', message: 'Müştəri ID tələb olunur.' };
  }
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
  return {
    status: 'success',
    orders: getOrderStats(),
    routes: getRouteStats()
  };
}
