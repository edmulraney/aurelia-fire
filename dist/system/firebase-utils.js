System.register(['lodash'], function (_export) {
  'use strict';

  var _, FirebaseUtils;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_lodash) {
      _ = _lodash['default'];
    }],
    execute: function () {
      FirebaseUtils = (function () {
        function FirebaseUtils() {
          _classCallCheck(this, FirebaseUtils);
        }

        _createClass(FirebaseUtils, [{
          key: 'doRemove',
          value: function doRemove(ref) {
            return new Promise(function (resolve) {
              if (_.isFunction(ref.remove)) {
                ref.remove(resolve);
              } else {
                ref.once('value', function (snap) {
                  return snap.forEach(function (ss) {
                    return ss.ref().remove();
                  });
                });
              }
            });
          }
        }, {
          key: 'doSet',
          value: function doSet(ref, data) {
            var _this = this;

            return new Promise(function (resolve, reject) {
              if (_.isFunction(ref.set) || !_.isObject(data)) {
                ref.set(data, resolve);
              } else {
                (function () {
                  var dataCopy = _.extend({}, data);

                  ref.once('value', function (snap) {
                    snap.forEach(function (ss) {
                      if (!dataCopy.hasOwnProperty(_this.getKey(ss))) {
                        dataCopy[_this.getKey(ss)] = null;
                      }
                    });
                    ref.ref().update(dataCopy, resolve);
                  }, reject);
                })();
              }
            });
          }
        }, {
          key: 'getPrototypeMethods',
          value: function getPrototypeMethods(inst, iterator, context) {
            var methods = {};
            var objProto = Object.getPrototypeOf({});
            var proto = _.isFunction(inst) && _.isObject(inst.prototype) ? inst.prototype : Object.getPrototypeOf(inst);
            while (proto && proto !== objProto) {
              for (var index in Object.getOwnPropertyNames(proto)) {
                var key = Object.getOwnPropertyNames(proto)[index];

                if (proto.hasOwnProperty(key) && !methods.hasOwnProperty(key)) {
                  methods[key] = true;
                  iterator.call(context, proto[key], key, proto);
                }
              }
              proto = Object.getPrototypeOf(proto);
            }
          }
        }, {
          key: 'getPublicMethods',
          value: function getPublicMethods(inst, iterator, context) {
            this.getPrototypeMethods(inst, function (m, k) {
              if (typeof m === 'function' && k.charAt(0) !== '_') {
                iterator.call(context, m, k);
              }
            });
          }
        }, {
          key: 'each',
          value: function each(obj, iterator, context) {
            if (obj === Object(obj)) {
              for (var k in obj) {
                if (obj.hasOwnProperty(k)) {
                  var c = k.charAt(0);
                  if (c !== '_' && c !== '$' && c !== '.') {
                    iterator.call(context, obj[k], k, obj);
                  }
                }
              }
            } else if (Array.isArray(obj)) {
              for (var i = 0, len = obj.length; i < len; i++) {
                iterator.call(context, obj[i], i, obj);
              }
            }
            return obj;
          }
        }, {
          key: 'trimKeys',
          value: function trimKeys(dest, source) {
            this.each(dest, function (v, k) {
              if (!source.hasOwnProperty(k)) {
                delete dest[k];
              }
            });
          }
        }, {
          key: 'getKey',
          value: function getKey(refOrSnapshot) {
            return refOrSnapshot.key();
          }
        }, {
          key: 'updateRec',
          value: function updateRec(rec, snap) {
            var data = snap.val();
            var oldData = _.extend({}, rec);

            if (!_.isObject(data)) {
              rec.$value = data;
              data = {};
            } else {
              delete rec.$value;
            }

            this.trimKeys(rec, data);
            _.extend(rec, data);
            rec.$priority = snap.getPriority();

            return !this.areEqual(oldData, rec) || oldData.$value !== rec.$value || oldData.$priority !== rec.$priority;
          }
        }, {
          key: 'toJSON',
          value: function toJSON(rec) {
            var _this2 = this;

            var data = {};
            if (!_.isObject(rec)) {
              rec = { $value: rec };
            }
            if (_.isFunction(rec.toJSON)) {
              data = rec.toJSON();
            } else {
              this.each(rec, function (v, k) {
                data[k] = _this2.stripDollarPrefixedKeys(v);
              });
            }
            if (!_.isUndefined(rec.$value) && Object.keys(data).length === 0 && rec.$value !== null) {
              data['.value'] = rec.$value;
            }
            if (!_.isUndefined(rec.$priority) && Object.keys(data).length > 0 && rec.$priority !== null) {
              data['.priority'] = rec.$priority;
            }
            _.forEach(data, function (v, k) {
              if (k.match(/[.$\[\]#\/]/) && k !== '.value' && k !== '.priority') {
                throw new Error('Invalid key ' + k + ' (cannot contain .$[]#)');
              } else if (_.isUndefined(v)) {
                throw new Error('Key ' + k + ' was undefined. Cannot pass undefined in JSON. Use null instead.');
              }
            });
            return data;
          }
        }, {
          key: 'areEqual',
          value: function areEqual(obj1, obj2) {
            return Object.keys(obj1).every(function (key) {
              return obj2.hasOwnProperty(key) && obj1[key] === obj2[key];
            });
          }
        }, {
          key: 'stripDollarPrefixedKeys',
          value: function stripDollarPrefixedKeys(data) {
            var _this3 = this;

            if (!_.isObject(data)) {
              return data;
            }
            var out = _.isArray(data) ? [] : {};
            data.forEach(function (v, k) {
              if (typeof k !== 'string' || k.charAt(0) !== '$') {
                out[k] = _this3.stripDollarPrefixedKeys(v);
              }
            });
            return out;
          }
        }]);

        return FirebaseUtils;
      })();

      _export('FirebaseUtils', FirebaseUtils);
    }
  };
});