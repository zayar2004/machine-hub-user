/* Machine Hub User — IndexedDB wrapper */
(function () {
  'use strict';

  var DB_NAME = 'mh_user';
  var DB_VERSION = 2;
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
        if (!db.objectStoreNames.contains('favorites')) {
          db.createObjectStore('favorites', { keyPath: 'machine_code' });
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

  function toggleFavorite(record) {
    return tx('favorites', 'readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.get(record.machine_code);
        req.onsuccess = function () {
          if (req.result) {
            var del = store.delete(record.machine_code);
            del.onsuccess = function () { resolve(false); };
            del.onerror = function () { reject(del.error); };
          } else {
            var put = store.put({
              machine_code: record.machine_code,
              machine_name: record.machine_name || record.machine_code,
              shop_code: record.shop_code || '',
              added_at: Date.now(),
            });
            put.onsuccess = function () { resolve(true); };
            put.onerror = function () { reject(put.error); };
          }
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function isFavorite(code) {
    return tx('favorites', 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.get(code);
        req.onsuccess = function () { resolve(!!req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function listFavorites() {
    return tx('favorites', 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.getAll();
        req.onsuccess = function () {
          var list = req.result || [];
          list.sort(function (a, b) { return (b.added_at || 0) - (a.added_at || 0); });
          resolve(list);
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function favoritesCount() {
    return tx('favorites', 'readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        var req = store.count();
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function snapshot() {
    return getAll().then(function (all) {
      return { records: all, ts: Date.now() };
    });
  }

  function restore(snap) {
    if (!snap || !snap.records) return Promise.resolve(0);
    return clear().then(function () {
      if (!snap.records.length) return 0;
      return putAll(snap.records);
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
    toggleFavorite: toggleFavorite,
    isFavorite: isFavorite,
    listFavorites: listFavorites,
    favoritesCount: favoritesCount,
    snapshot: snapshot,
    restore: restore,
  };

  console.log('[MH_DB] loaded');
})();
