/*
 * Stockage des images ajoutées par les parents (IndexedDB, reste sur la tablette).
 * Un élément : { id, kind: 'coloring' | 'puzzle' | 'memory', name, data, thumb, created }
 *   data  = image en data-URL (PNG transparent pour un coloriage, JPEG sinon)
 *   thumb = petite vignette pour l'espace parents
 * Les réglages simples (afficher les dessins de base...) sont dans localStorage.
 */
var Store = (function () {
  'use strict';

  var dbPromise = null;

  function db() {
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        var req = indexedDB.open('yaya', 1);
        req.onupgradeneeded = function () {
          var s = req.result.createObjectStore('items', { keyPath: 'id' });
          s.createIndex('kind', 'kind');
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }
    return dbPromise;
  }

  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction('items', mode);
        var result = fn(t.objectStore('items'));
        t.oncomplete = function () { resolve(result && result.result); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  function list(kind) {
    return tx('readonly', function (s) { return s.index('kind').getAll(kind); })
      .then(function (items) {
        return (items || []).sort(function (a, b) { return a.created - b.created; });
      })
      .catch(function () { return []; }); // en cas de souci, les jeux marchent quand même
  }

  function add(item) {
    item.id = item.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
    item.created = item.created || Date.now();
    return tx('readwrite', function (s) { s.put(item); }).then(function () { return item; });
  }

  function remove(id) {
    return tx('readwrite', function (s) { s.delete(id); });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Réglages : "afficher aussi les dessins de base" pour chaque jeu
  function getSetting(key, def) {
    try {
      var v = localStorage.getItem('yaya.' + key);
      return v == null ? def : JSON.parse(v);
    } catch (e) { return def; }
  }
  function setSetting(key, val) {
    try { localStorage.setItem('yaya.' + key, JSON.stringify(val)); } catch (e) { /* tant pis */ }
  }
  function showBuiltins(kind) { return getSetting('builtin.' + kind, true); }

  return {
    list: list, add: add, remove: remove, loadImage: loadImage,
    getSetting: getSetting, setSetting: setSetting, showBuiltins: showBuiltins
  };
})();
