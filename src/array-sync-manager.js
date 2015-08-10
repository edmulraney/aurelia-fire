export class ArraySyncManager {
  constructor(firebaseArray, firebaseUtils) {
    this.firebaseArray = firebaseArray;
    this.utils = firebaseUtils;
    this.isDestroyed = false;
    this.isResolved = false;
    this.handlers = [];
  }

  created(snap, prevChildKey) {
    // check to make sure record does not exist
    let record = null;
    let index = this.firebaseArray.indexFor(snap.key());
    if(index === -1) {
      // parse data and create record
      record = snap.val();
      if(record !== Object(record)) {
        record = { $value: record };
      }

      record.$id = snap.key();
      record.$priority = snap.getPriority();
      this.firebaseArray.insertAfter(record, prevChildKey);
    }
  }

  updated(snap) {
    let record = this.firebaseArray.getRecord(snap.key());
    if(record && record === Object(record)) {
      return this.utils.updateRec(record, snap);
    }
  }

  /**
   * Called whenever an item changes order (moves) on the server.
   * This method should set $priority to the updated value.
   *
   * @param {object} snap a Firebase snapshot
   * @param {string} prevChildKey
   * @protected
   */
  moved(snap, prevChildKey) {
    let record = this.firebaseArray.getRecord(snap.key());
    if(record && record === Object(record)) {
      record.$priority = snap.getPriority();
      let position = this.firebaseArray.indexFor(record.$id);
      this.firebaseArray.spliceOut(record.$id);
      if(position !== null) {
        this.firebaseArray.insertAfter(record, prevChildKey);
      }
    }
  }

  /**
   * Called whenever an item is removed at the server.
   *
   * @param {object} snap a Firebase snapshot
   * @return {boolean} true if item should be removed
   * @protected
   */
  removed(snap) {
    let record = this.firebaseArray.getRecord(snap.key());
    if(record) {
      this.firebaseArray._spliceOut(record.$id);
    }
  }

  error(error) {
    console.error(error);
    this.destroy(error);
  }

/**
 * Initialise the synchronization with firebase. Changes on the server will be applied to our FirebaseArray object.
 * Changes locally will be applied on the firebase server.
 * @return {[Promise]} [Returns a promise that resolves the array that we've sync'd, or rejects with an error message.]
 */
  init() {
    // determine when initial load is completed
    return new Promise((resolve, reject) => {
      let ref = this.firebaseArray.ref;
      let array = this.firebaseArray;

      // listen for changes at the Firebase instance
      this.handlers.added = ref.on('child_added', (snap, prevChildKey) => this.created(snap, prevChildKey), error => this.error(error));
      this.handlers.moved = ref.on('child_moved', (snap, prevChildKey) => this.moved(snap, prevChildKey), error => this.error(error));
      this.handlers.changed = ref.on('child_changed', (snap) => this.updated(snap), this.error);
      this.handlers.removed = ref.on('child_removed', (snap) => this.removed(snap), this.error);

      ref.once('value', snap => {
        if (snap.val() !== null && snap.val().constructor === Array) {
          console.warn('Storing data using array indices in Firebase can result in unexpected behavior. See https://www.firebase.com/docs/web/guide/understanding-data.html#section-arrays-in-firebase for more information.');
        }
        // successfully fetched firebase array
        this.isResolved = true;
        resolve(array);
      }, error => {
        // failed to get array
        this.isResolved = true;
        reject(error);
      });
    });
  }

  destroy(error) {
    if(!this.isDestroyed) {
      this.isDestroyed = true;
      let ref = this.firebaseArray.ref;
      ref.off('child_added', this.handlers.added);
      ref.off('child_moved', this.handlers.moved);
      ref.off('child_changed', this.handlers.changed);
      ref.off('child_removed', this.removed.removed);
      this.firebaseArray = null;
      this.isResolved = true;
    }
  }
}
