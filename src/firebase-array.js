import {FirebaseUtils} from "./firebase-utils";
import {ArraySyncManager} from "./array-sync-manager";

export class FirebaseArray extends Array {
  constructor(ref) {
      super();
      this._ref = ref;
      this._indexCache = {};
      this._utils = new FirebaseUtils();
      this._isDestroyed = false;
      this._sync = new ArraySyncManager(this, this._utils);
      return this._sync.init();
  }

  get ref() {
    return this._ref;
  }

  /**
   * Create a new record with a unique ID and add it to the end of the array.
   * This should be used instead of Array.prototype.push, since those changes will not be
   * synchronized with the server.
   *
   * Any value, including a primitive, can be added in this way. Note that when the record
   * is created, the primitive value would be stored in $value (records are always objects
   * by default).
   *
   * Returns a future which is resolved when the data has successfully saved to the server.
   * The resolve callback will be passed a Firebase ref representing the new data element.
   *
   * @param data
   * @returns a promise resolved after data is added
   */
   add(data) {
    return new Promise((resolve, reject) => {
      let ref = this.ref.ref().push(this._utils.toJSON(data), error => {
        if(error === null) {
          resolve(ref);
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Pass either an item in the array or the index of an item and it will be saved back
   * to Firebase. While the array is read-only and its structure should not be changed,
   * it is okay to modify properties on the objects it contains and then save those back
   * individually.
   *
   * Returns a future which is resolved when the data has successfully saved to the server.
   * The resolve callback will be passed a Firebase ref representing the saved element.
   * If passed an invalid index or an object which is not a record in this array,
   * the promise will be rejected.
   *
   * @param {int|object} indexOrItem
   * @returns a promise resolved after data is saved
   */
  save(indexOrItem) {
    let item = this._resolveItem(indexOrItem);
    let key = this.keyAt(item);
    if(key !== null) {
      let ref = this.ref.ref().child(key);
      let data = this._utils.toJSON(item);
      return this._utils.doSet(ref, data).then(() => {
        return ref;
      });
    }
    else {
      return this._utils.reject('Invalid record; could determine key for '+indexOrItem);
    }
  }

  /**
   * Pass either an existing item in this array or the index of that item and it will
   * be removed both locally and in Firebase. This should be used in place of
   * Array.prototype.splice for removing items out of the array, as calling splice
   * will not update the value on the server.
   *
   * Returns a future which is resolved when the data has successfully removed from the
   * server. The resolve callback will be passed a Firebase ref representing the deleted
   * element. If passed an invalid index or an object which is not a record in this array,
   * the promise will be rejected.
   *
   * @param {int|object} keyOrIndexOrItem
   * @returns a promise which resolves after data is removed
   */
  remove(keyOrIndexOrItem) {
    return new Promise((resolve, reject) => {
      let key = this.isValidKey(keyOrIndexOrItem) ? keyOrIndexOrItem : this.keyAt(keyOrIndexOrItem);
      if(key !== null) {
        let ref = this.ref.ref().child(key);
        this._utils.doRemove(ref).then(() => resolve(ref));
      } else {
        reject('Invalid record; could not determine key for '+keyOrIndexOrItem);
      }
    });
  }

  isValidKey(key) {
    return key in this._indexCache;
  }

  /**
   * Given an item in this array or the index of an item in the array, this returns the
   * Firebase key (record.$id) for that record. If passed an invalid key or an item which
   * does not exist in this array, it will return null.
   *
   * @param {int|object} indexOrItem
   * @returns {null|string}
   */
  keyAt(indexOrItem) {
    let item = this._resolveItem(indexOrItem);
    return this.getKey(item);
  }

  indexFor(key) {
    let cache = this._indexCache;
    // evaluate whether our key is cached and, if so, whether it is up to date
    if(!cache.hasOwnProperty(key) || this.keyAt(cache[key]) !== key) {
      // update the hashmap
      let pos = this.findIndex(record => { return this.getKey(record) === key; });
      if(pos !== -1) {
        cache[key] = pos;
      }
    }
    return cache.hasOwnProperty(key)? cache[key] : -1;
  }

  /**
   * Returns ID for a given record
   * @param {object} record
   * @returns {string||null}
   * @protected
   */
  getKey(record) {
    return record === Object(record) ? record.$id : null;
  }

  /**
   * Returns the record for a given Firebase key (record.$id). If the record is not found
   * then returns null.
   *
   * @param {string} key
   * @returns {Object|null} a record in this array
   */
  getRecord(key) {
    let i = this.indexFor(key);
    return i > -1? this[i] : null;
  }

  /**
   * Used to insert a new record into the array at a specific position. If prevChildKey is
   * null, is inserted first, if prevChildKey is not found, it is inserted last, otherwise,
   * it goes immediately after prevChildKey.
   *
   * @param {object} record
   * @param {string|null} prevChildKey
   * @private
   */
  insertAfter(record, prevChildKey) {
    let index = 0;
    if(prevChildKey !== null) {
      index = this.indexFor(prevChildKey)+1;
      if(index === 0) { index = this.length; }
    }
    this.splice(index, 0, record);
    this._indexCache[this.getKey(record)] = index;
    return index;
  }

  /**
   * Removes a record from the array by calling splice. If the item is found
   * this method returns it. Otherwise, this method returns null.
   *
   * @param {string} key
   * @returns {object|null}
   * @private
   */
  _spliceOut(key) {
    let i = this.indexFor(key);
    if( i > -1 ) {
      delete this._indexCache[key];
      return this.splice(i, 1)[0];
    }
    return null;
  }

  /**
   * Resolves a variable which may contain an integer or an item that exists in this array.
   * Returns the item or null if it does not exist.
   *
   * @param indexOrItem
   * @returns {*}
   * @private
   */
  _resolveItem(indexOrItem) {
    if(typeof indexOrItem == 'number' && indexOrItem >= 0 && this.length >= indexOrItem ) {
      return this[indexOrItem];
    }
    else if(indexOrItem === Object(indexOrItem)) {
      // it must be an item in this array; it's not sufficient for it just to have
      // a $id or even a $id that is in the array, it must be an actual record
      // the fastest way to determine this is to use $getRecord (to avoid iterating all recs)
      // and compare the two
      let key = this.getKey(indexOrItem);
      let record = this.getRecord(key);
      return record === indexOrItem? record : null;
    }
    return null;
  }

  /**
   * Informs firebase to stop sending events and clears memory being used
   * by this array (delete's its local content).
   */
  destroy(error) {
    if(!this._isDestroyed) {
      this._isDestroyed = true;
      this._sync.destroy(error);
      this.length = 0;
      this.add = this.save = this.remove = undefined;
    }
  }
}
