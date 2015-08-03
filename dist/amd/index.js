define(['exports', './firebase-array'], function (exports, _firebaseArray) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.configure = configure;
  Object.defineProperty(exports, 'FirebaseArray', {
    enumerable: true,
    get: function get() {
      return _firebaseArray.FirebaseArray;
    }
  });

  function configure(aurelia) {}
});