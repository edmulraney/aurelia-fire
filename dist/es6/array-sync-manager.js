import {FirebaseUtils} from "./firebase-utils";

export class ArraySyncManager {
  constructor(firebaseArray) {
    this.firebaseArray = firebaseArray;
    this.firebaseUtils = new FirebaseUtils();
    this.isDestroyed = false;
    this.isResolved = false;
  }

  created(snap, prevChild) {
    let record = this.firebaseArray.added(snap);
    this.firebaseArray.process('child_added', record, prevChild);
  }

  updated(snap) {
    let record = this.firebaseArray.getRecord(this.firebaseUtils.getKey(snap));
    if(record) {
      this.firebaseArray.updated(snap);
      this.firebaseArray.process('child_changed', record);
    }
  }

  moved(snap, prevChild) {
    let record = this.firebaseArray.getRecord(this.firebaseUtils.getKey(snap));
    if(record) {
      this.firebaseArray.moved(snap);
      this.firebaseArray.process('child_moved', record, prevChild);
    }
  }

  removed(snap) {
    let record = this.firebaseArray.getRecord(this.firebaseUtils.getKey(snap));
    if(record) {
      this.firebaseArray.removed(snap);
      this.firebaseArray.process('child_removed', record);
    }
  }

  init(list) {
    // determine when initial load is completed
    return new Promise((resolve, reject) => {
      let ref = this.firebaseArray.ref;
      // listen for changes at the Firebase instance
      ref.on('child_added', (a,b) => this.created(a,b), this.error);
      ref.on('child_moved', (a,b) => this.moved(a,b), this.error);
      ref.on('child_changed', (a) => this.updated(a), this.error);
      ref.on('child_removed', (a) => this.removed(a), this.error);

      ref.once('value', snap => {
        if (snap.val().constructor === Array) {
          this.log.warn('Storing data using array indices in Firebase can result in unexpected behavior. See https://www.firebase.com/docs/web/guide/understanding-data.html#section-arrays-in-firebase for more information.');
        }
        // successfully fetched firebase list
        this.isResolved = true;
        resolve(list);
      }, error => {
        // failed to get list
        this.isResolved = true;
        reject(error);
      });
    });
  }

  destroy(error) {
    if(!this.isDestroyed) {
      this.isDestroyed = true;
      let ref = this.firebaseArray.ref;
      ref.off('child_added', this.created);
      ref.off('child_moved', this.moved);
      ref.off('child_changed', this.updated);
      ref.off('child_removed', this.removed);
      this.firebaseArray = null;
      this.isResolved = true;
    }
  }
}
