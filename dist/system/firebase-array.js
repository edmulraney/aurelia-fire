System.register(["./firebase-utils", "./array-sync-manager"], function (_export) {
  "use strict";

  var FirebaseUtils, ArraySyncManager, FirebaseArray;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_firebaseUtils) {
      FirebaseUtils = _firebaseUtils.FirebaseUtils;
    }, function (_arraySyncManager) {
      ArraySyncManager = _arraySyncManager.ArraySyncManager;
    }],
    execute: function () {
      FirebaseArray = (function () {
        function FirebaseArray(ref) {
          var _this = this;

          _classCallCheck(this, FirebaseArray);

          this.list = [];
          this._ref = ref;
          this._indexCache = {};
          this._isDestroyed = false;
          this.firebaseUtils = new FirebaseUtils();
          this._sync = new ArraySyncManager(this);
          this._sync.init(this.list);

          this.firebaseUtils.getPublicMethods(this, function (fn, key) {
            _this.list[key] = fn.bind(_this);
          });

          return this.list;
        }

        _createClass(FirebaseArray, [{
          key: "add",
          value: function add(data) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
              var ref = _this2.ref.ref().push(_this2.firebaseUtils.toJSON(data), function (error) {
                if (error === null) {
                  resolve(ref);
                } else {
                  reject(error);
                }
              });
            });
          }
        }, {
          key: "save",
          value: function save(indexOrItem) {
            var _this3 = this;

            var item = this._resolveItem(indexOrItem);
            var key = this.keyAt(item);
            if (key !== null) {
              var _ret = (function () {
                var ref = _this3.ref.ref().child(key);
                var data = _this3.firebaseUtils.toJSON(item);
                return {
                  v: _this3.firebaseUtils.doSet(ref, data).then(function () {
                    _this3.notify('child_changed', key);
                    return ref;
                  })
                };
              })();

              if (typeof _ret === "object") return _ret.v;
            } else {
              return this.firebaseUtils.reject('Invalid record; could determine key for ' + indexOrItem);
            }
          }
        }, {
          key: "remove",
          value: function remove(keyOrIndexOrItem) {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
              var key = _this4.isKey(keyOrIndexOrItem) ? keyOrIndexOrItem : _this4.keyAt(keyOrIndexOrItem);
              if (key !== null) {
                (function () {
                  var ref = _this4.ref.ref().child(key);
                  _this4.firebaseUtils.doRemove(ref).then(function () {
                    return resolve(ref);
                  });
                })();
              } else {
                reject('Invalid record; could not determine key for ' + keyOrIndexOrItem);
              }
            });
          }
        }, {
          key: "isKey",
          value: function isKey(key) {
            return !!this._indexCache[key];
          }
        }, {
          key: "keyAt",
          value: function keyAt(indexOrItem) {
            var item = this._resolveItem(indexOrItem);
            return this.getKey(item);
          }
        }, {
          key: "indexFor",
          value: function indexFor(key) {
            var _this5 = this;

            var cache = this._indexCache;

            if (!cache.hasOwnProperty(key) || this.keyAt(cache[key]) !== key) {
              var pos = this.list.findIndex(function (record) {
                return _this5.getKey(record) === key;
              });
              if (pos !== -1) {
                cache[key] = pos;
              }
            }
            return cache.hasOwnProperty(key) ? cache[key] : -1;
          }
        }, {
          key: "added",
          value: function added(snap) {
            var i = this.indexFor(this.firebaseUtils.getKey(snap));
            if (i === -1) {
              var record = snap.val();
              if (record !== Object(record)) {
                record = { $value: record };
              }

              record.$id = this.firebaseUtils.getKey(snap);
              record.$priority = snap.getPriority();

              return record;
            }
            return false;
          }
        }, {
          key: "removed",
          value: function removed(snap) {
            return this.indexFor(this.firebaseUtils.getKey(snap)) > -1;
          }
        }, {
          key: "updated",
          value: function updated(snap) {
            var changed = false;
            var record = this.getRecord(this.firebaseUtils.getKey(snap));
            if (record === Object(record)) {
              changed = this.firebaseUtils.updateRec(record, snap);
            }
            return changed;
          }
        }, {
          key: "moved",
          value: function moved(snap) {
            var record = this.getRecord(this.firebaseUtils.getKey(snap));
            if (record === Object(record)) {
              record.$priority = snap.getPriority();
              return true;
            }
            return false;
          }
        }, {
          key: "getKey",
          value: function getKey(record) {
            return record === Object(record) ? record.$id : null;
          }
        }, {
          key: "process",
          value: function process(event, record, prevChild) {
            var key = this.getKey(record);
            var changed = false;
            var position = null;

            switch (event) {
              case 'child_added':
                position = this.indexFor(key);
                break;
              case 'child_moved':
                position = this.indexFor(key);
                this._spliceOut(key);
                break;
              case 'child_removed':
                changed = this._spliceOut(key) !== null;
                break;
              case 'child_changed':
                changed = true;
                break;
              default:
                throw new Error('Invalid event type: ' + event);
            }
            if (position !== null) {
              changed = this._addAfter(record, prevChild) !== position;
            }
            if (changed) {
              this.notify(event, key, prevChild);
            }
            return changed;
          }
        }, {
          key: "notify",
          value: function notify(event, key, prevChild) {
            var eventData = { event: event, key: key };
            if (prevChild !== null) {
              eventData.prevChild = prevChild;
            }
          }
        }, {
          key: "destroy",
          value: function destroy(error) {
            if (!this._isDestroyed) {
              this._isDestroyed = true;
              this._sync.destroy(error);
              this.list.length = 0;
            }
          }
        }, {
          key: "getRecord",
          value: function getRecord(key) {
            var i = this.indexFor(key);
            return i > -1 ? this.list[i] : null;
          }
        }, {
          key: "_addAfter",
          value: function _addAfter(record, prevChild) {
            var i = 0;
            if (prevChild !== null) {
              i = this.indexFor(prevChild) + 1;
              if (i === 0) {
                i = this.list.length;
              }
            }
            this.list.splice(i, 0, record);
            this._indexCache[this.getKey(record)] = i;
            return i;
          }
        }, {
          key: "_spliceOut",
          value: function _spliceOut(key) {
            var i = this.indexFor(key);
            if (i > -1) {
              delete this._indexCache[key];
              return this.list.splice(i, 1)[0];
            }
            return null;
          }
        }, {
          key: "_resolveItem",
          value: function _resolveItem(indexOrItem) {
            var list = this.list;
            if (typeof indexOrItem == 'number' && indexOrItem >= 0 && list.length >= indexOrItem) {
              return list[indexOrItem];
            } else if (indexOrItem === Object(indexOrItem)) {
              var key = this.getKey(indexOrItem);
              var record = this.getRecord(key);
              return record === indexOrItem ? record : null;
            }
            return null;
          }
        }, {
          key: "ref",
          get: function get() {
            return this._ref;
          }
        }]);

        return FirebaseArray;
      })();

      _export("FirebaseArray", FirebaseArray);
    }
  };
});