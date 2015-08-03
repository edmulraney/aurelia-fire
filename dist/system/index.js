System.register([], function (_export) {
  'use strict';

  _export('configure', configure);

  function configure(aurelia) {
    aurelia.globalizeResources('./firebase-array');
  }

  return {
    setters: [],
    execute: function () {}
  };
});