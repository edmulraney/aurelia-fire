import {FirebaseUtils} from "./firebase-utils";
import {ArraySyncManager} from "./array-sync-manager";

export class FirebaseArray {
  constructor(ref) {
      this.list = [];
      this._ref = ref;
      this._indexCache = {};
      this._isDestroyed = false;
      this.firebaseUtils = new FirebaseUtils();
      this._sync = new ArraySyncManager(this);
      this._sync.init(this.list);

      // Add public methods to this FirebaseArray
      this.firebaseUtils.getPublicMethods(this, (fn, key) => {
        this.list[key] = fn.bind(this);
      });

      return this.list;
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
      let ref = this.ref.ref().push(this.firebaseUtils.toJSON(data), error => {
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
      let data = this.firebaseUtils.toJSON(item);
      return this.firebaseUtils.doSet(ref, data).then(() => {
        this.notify('child_changed', key);
        return ref;
      });
    }
    else {
      return this.firebaseUtils.reject('Invalid record; could determine key for '+indexOrItem);
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
      let key = this.isKey(keyOrIndexOrItem) ? keyOrIndexOrItem : this.keyAt(keyOrIndexOrItem);
      if(key !== null) {
        let ref = this.ref.ref().child(key);
        this.firebaseUtils.doRemove(ref).then(() => resolve(ref));
      } else {
        reject('Invalid record; could not determine key for '+keyOrIndexOrItem);
      }
    });
  }

  isKey(key) {
    return !!this._indexCache[key];
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
      let pos = this.list.findIndex(record => { return this.getKey(record) === key; });
      if(pos !== -1) {
        cache[key] = pos;
      }
    }
    return cache.hasOwnProperty(key)? cache[key] : -1;
  }

  added(snap) {
    // check to make sure record does not exist
    let i = this.indexFor(this.firebaseUtils.getKey(snap));
    if(i === -1) {
      // parse data and create record
      let record = snap.val();
      if(record !== Object(record)) {
        record = { $value: record };
      }

      record.$id = this.firebaseUtils.getKey(snap);
      record.$priority = snap.getPriority();

      return record;
    }
    return false;
  }

  /**
   * Called whenever an item is removed at the server.
   * This method does not physically remove the objects, but instead
   * returns a boolean indicating whether it should be removed (and
   * taking any other desired actions before the remove completes).
   *
   * @param {object} snap a Firebase snapshot
   * @return {boolean} true if item should be removed
   * @protected
   */
  removed(snap) {
    return this.indexFor(this.firebaseUtils.getKey(snap)) > -1;
  }

  /**
   * Called whenever an item is changed at the server.
   * This method should apply the changes, including changes to data
   * and to $priority, and then return true if any changes were made.
   *
   * If this method returns false, then process will not be invoked,
   * which means that notify will not take place and no $watch events
   * will be triggered.
   *
   * @param {object} snap a Firebase snapshot
   * @return {boolean} true if any data changed
   * @protected
   */
  updated(snap) {
    let changed = false;
    let record = this.getRecord(this.firebaseUtils.getKey(snap));
    if(record === Object(record)) {
      // apply changes to the record
      changed = this.firebaseUtils.updateRec(record, snap);
    }
    return changed;
  }

  /**
   * Called whenever an item changes order (moves) on the server.
   * This method should set $priority to the updated value and return true if
   * the record should actually be moved. It should not actually apply the move
   * operation.
   *
   * If this method returns false, then the record will not be moved in the array
   * and no $watch listeners will be notified. (When true, $$process is invoked
   * which invokes $$notify)
   *
   * @param {object} snap a Firebase snapshot
   * @param {string} prevChild
   * @protected
   */
  moved(snap) {
    let record = this.getRecord(this.firebaseUtils.getKey(snap));
    if(record === Object(record)) {
      record.$priority = snap.getPriority();
      return true;
    }
    return false;
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
   * Handles placement of recs in the array, sending notifications,
   * and other internals. Called by the synchronization process
   * after added, updated, moved, and removed return a truthy value.
   *
   * @param {string} event one of child_added, child_removed, child_moved, or child_changed
   * @param {object} rec
   * @param {string} [prevChild]
   * @protected
   */
  process(event, record, prevChild) {
    let key = this.getKey(record);
    let changed = false;
    let position = null;

    switch(event) {
      case 'child_added':
        position = this.indexFor(key);
        break;
      case 'child_moved':
        position = this.indexFor(key);
        this._spliceOut(key);
        break;
      case 'child_removed':
        // remove record from the array
        changed = this._spliceOut(key) !== null;
        break;
      case 'child_changed':
        changed = true;
        break;
      default:
        throw new Error('Invalid event type: ' + event);
    }
    if(position !== null) {
      // add it to the array
      changed = this._addAfter(record, prevChild) !== position;
    }
    if(changed) {
      // send notifications to anybody monitoring $watch
      this.notify(event, key, prevChild);
    }
    return changed;
  }

  /**
   * Used to trigger notifications for listeners registered using $watch. This method is
   * typically invoked internally by the $$process method.
   *
   * @param {string} event
   * @param {string} key
   * @param {string} [prevChild]
   * @protected
   */
  notify(event, key, prevChild) {
    let eventData = {event: event, key: key};
    if(prevChild !== null) {
      eventData.prevChild = prevChild;
    }
    // this._observers.forEach(o => o[0].call(o[1], eventData));
  }

  /**
   * Informs $firebase to stop sending events and clears memory being used
   * by this array (delete's its local content).
   */
  destroy(error) {
    if(!this._isDestroyed) {
      this._isDestroyed = true;
      this._sync.destroy(error);
      this.list.length = 0;
    }
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
    return i > -1? this.list[i] : null;
  }

  /**
   * Used to insert a new record into the array at a specific position. If prevChild is
   * null, is inserted first, if prevChild is not found, it is inserted last, otherwise,
   * it goes immediately after prevChild.
   *
   * @param {object} record
   * @param {string|null} prevChild
   * @private
   */
  _addAfter(record, prevChild) {
    let i = 0;
    if(prevChild !== null) {
      i = this.indexFor(prevChild)+1;
      if( i === 0 ) { i = this.list.length; }
    }
    this.list.splice(i, 0, record);
    this._indexCache[this.getKey(record)] = i;
    return i;
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
      return this.list.splice(i, 1)[0];
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
    let list = this.list;
    if(typeof indexOrItem == 'number' && indexOrItem >= 0 && list.length >= indexOrItem ) {
      return list[indexOrItem];
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

}
