System.register(['./firebase-utils'], function (_export) {
  'use strict';

  var FirebaseUtils, ArraySyncManager;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_firebaseUtils) {
      FirebaseUtils = _firebaseUtils.FirebaseUtils;
    }],
    execute: function () {
      ArraySyncManager = (function () {
        function ArraySyncManager(firebaseArray) {
          _classCallCheck(this, ArraySyncManager);

          this.firebaseArray = firebaseArray;
          this.firebaseUtils = new FirebaseUtils();
          this.isDestroyed = false;
          this.isResolved = false;
        }

        _createClass(ArraySyncManager, [{
          key: 'created',
          value: function created(snap, prevChild) {
            var record = this.firebaseArray.added(snap);
            this.firebaseArray.process('child_added', record, prevChild);
          }
        }, {
          key: 'updated',
          value: function updated(snap) {
            var record = this.firebaseArray.getRecord(this.firebaseUtils.getKey(snap));
            if (record) {
              this.firebaseArray.updated(snap);
              this.firebaseArray.process('child_changed', record);
            }
          }
        }, {
          key: 'moved',
          value: function moved(snap, prevChild) {
            var record = this.firebaseArray.getRecord(this.firebaseUtils.getKey(snap));
            if (record) {
              this.firebaseArray.moved(snap);
              this.firebaseArray.process('child_moved', record, prevChild);
            }
          }
        }, {
          key: 'removed',
          value: function removed(snap) {
            var record = this.firebaseArray.getRecord(this.firebaseUtils.getKey(snap));
            if (record) {
              this.firebaseArray.removed(snap);
              this.firebaseArray.process('child_removed', record);
            }
          }
        }, {
          key: 'init',
          value: function init(list) {
            var _this = this;

            return new Promise(function (resolve, reject) {
              var ref = _this.firebaseArray.ref;

              ref.on('child_added', function (a, b) {
                return _this.created(a, b);
              }, _this.error);
              ref.on('child_moved', function (a, b) {
                return _this.moved(a, b);
              }, _this.error);
              ref.on('child_changed', function (a) {
                return _this.updated(a);
              }, _this.error);
              ref.on('child_removed', function (a) {
                return _this.removed(a);
              }, _this.error);

              ref.once('value', function (snap) {
                if (snap.val().constructor === Array) {
                  _this.log.warn('Storing data using array indices in Firebase can result in unexpected behavior. See https://www.firebase.com/docs/web/guide/understanding-data.html#section-arrays-in-firebase for more information.');
                }

                _this.isResolved = true;
                resolve(list);
              }, function (error) {
                _this.isResolved = true;
                reject(error);
              });
            });
          }
        }, {
          key: 'destroy',
          value: function destroy(error) {
            if (!this.isDestroyed) {
              this.isDestroyed = true;
              var ref = this.firebaseArray.ref;
              ref.off('child_added', this.created);
              ref.off('child_moved', this.moved);
              ref.off('child_changed', this.updated);
              ref.off('child_removed', this.removed);
              this.firebaseArray = null;
              this.isResolved = true;
            }
          }
        }]);

        return ArraySyncManager;
      })();

      _export('ArraySyncManager', ArraySyncManager);
    }
  };
});