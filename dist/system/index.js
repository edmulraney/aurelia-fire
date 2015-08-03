System.register(['./firebase-array'], function (_export) {
  'use strict';

  _export('configure', configure);

  function configure(aurelia) {}

  return {
    setters: [function (_firebaseArray) {
      _export('FirebaseArray', _firebaseArray.FirebaseArray);
    }],
    execute: function () {}
  };
});