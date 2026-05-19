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

    if (!customerID) {
      return { status: 'error', message: 'Müştəri ID tələb olunur.' };
    }

    var orderID = generateOrderID(customerID);
    var status = ORDER_STATUS_ACTIVE;
    var notes = data.notes ? data.notes : '-';

    var rowData = [
      customerID,
      data.goodType || '',
      data.goodName || '',
      data.material || '',
      data.fragility || '',
      data.weight || '',
      data.width || '',
      data.length || '',
      data.height || '',
      data.pickupCity || '',
      data.pickupAddress || '',
      data.dropCity || '',
      data.dropAddress || '',
      data.pickupDate || '',
      data.dropDate || '',
      data.budget || '',
      status,
      notes,
      orderID
    ];

    appendToSheet(SHEET_ORDERS, rowData);

    return {
      status: 'success',
      message: 'Sifariş uğurla yadda saxlanıldı.',
      orderID: orderID
    };
  } catch (err) {
    return { status: 'error', message: 'Backend xətası: ' + err.toString() };
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
  if (!customerId) {
    return { status: 'error', message: 'Müştəri ID tələb olunur.' };
  }
  return { status: 'success', orders: getOrdersFiltered(null, customerId) };
}

function handleTrack(data) {
  var trackId = String(data.trackId || '').trim();
  if (!trackId) {
    return { status: 'error', message: 'İzləmə nömrəsi daxil edin.' };
  }

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
