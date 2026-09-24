/* Machine Hub User — Excel import via SheetJS */
(function () {
  'use strict';

  function normalizeHeader(s) {
    return String(s || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
  }

  function normalizeRow(row) {
    var out = {};
    Object.keys(row).forEach(function (k) {
      out[normalizeHeader(k)] = row[k];
    });
    return out;
  }

  function parseFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = new Uint8Array(e.target.result);
          var wb = XLSX.read(data, { type: 'array' });
          var sheet = wb.Sheets[wb.SheetNames[0]];
          var json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsArrayBuffer(file);
    });
  }

  function toRecords(rows) {
    var out = [];
    var seen = {};
    var invalid = 0;
    var duplicate = 0;
    var invalidSamples = [];
    var duplicateSamples = [];

    rows.forEach(function (raw, idx) {
      var r = normalizeRow(raw);
      var code = String(r.machine_code || '').trim();
      var name = String(r.machine_name || '').trim() || code;
      var shop = String(r.shop_code || r.location || '').trim();
      var desc = String(r.description || r.arrival_date || '').trim();

      if (!code) {
        invalid++;
        if (invalidSamples.length < 5) {
          invalidSamples.push({ row: idx + 2 });  // +2 (1-index + header)
        }
        return;
      }
      if (seen[code]) {
        duplicate++;
        if (duplicateSamples.length < 5) {
          duplicateSamples.push({ row: idx + 2, code: code });
        }
        return;
      }
      seen[code] = true;

      out.push({
        machine_code: code,
        code_lower: code.toLowerCase(),
        machine_name: name,
        name_lower: name.toLowerCase(),
        shop_code: shop,
        description: desc,
      });
    });

    return {
      records: out,
      invalid: invalid,
      duplicate: duplicate,
      invalidSamples: invalidSamples,
      duplicateSamples: duplicateSamples,
      totalRows: rows.length,
    };
  }

  window.MH_EXCEL = {
    parseFile: parseFile,
    toRecords: toRecords,
  };

  console.log('[MH_EXCEL] loaded');
})();
