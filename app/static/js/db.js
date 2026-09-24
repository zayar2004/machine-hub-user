/* Machine Hub User — IndexedDB wrapper */
(function () {
  'use strict';

  var DB_NAME = 'mh_user';
  var DB_VERSION = 1;
  var STORE_MACHINES = 'machines';
  var STORE_META = 'meta';

  var _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_MACHINES)) {
          var s = db.createObjectStore(STORE_MACHINES, { keyPath: 'machine_code' });
          s.createIndex('code_lower', 'code_lower', { unique: false });
          s.createIndex('name_lower', 'name_lower', { unique: false });
          s.createIndex('shop_code', 'shop_code', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };
      req.onsuccess = function () {
        _db = req.result;
        resolve(_db);
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(store, mode) {
    return open().then(function (db) {
      return db.transaction(store, mode).objectStore(store);
    });
  }

  function putAll(records) {
    return tx(STORE_MACHINES, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        var count = 0;
        records.forEach(function (r) {
          var req = store.put(r);
          req.onsuccess = function () { count++; };
          req.onerror = function () { reject(req.error); };
        });
        store.transaction.oncomplete = function () { resolve(count); };
        store.transaction.onerror = function () { reject(store.transaction.error); };
      });
    });
  }

  function clear() {
    return tx(STORE_MACHINES, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.clear();
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function count() {
    return tx(STORE_MACHINES, 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.count();
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getAll() {
    return tx(STORE_MACHINES, 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function setMeta(key, value) {
    return tx(STORE_META, 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.put({ key: key, value: value });
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getMeta(key) {
    return tx(STORE_META, 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.get(key);
        req.onsuccess = function () { resolve(req.result ? req.result.value : null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  window.MH_DB = {
    open: open,
    putAll: putAll,
    clear: clear,
    count: count,
    getAll: getAll,
    setMeta: setMeta,
    getMeta: getMeta,
  };

  console.log('[MH_DB] loaded');
})();
