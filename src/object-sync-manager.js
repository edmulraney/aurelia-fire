import _ from 'lodash';

export class ObjectSyncManager {
  constructor(firebaseObject) {
    this.firebaseObject = firebaseObject;
    this.isResolved = false;
    this.isDestroyed = false;
    this.updatedHandlerReference = null;
  }

  destroy(err) {
    if(!this.isDestroyed) {
      this.isDestroyed = true;
      // we have to use the exact reference of the initial 'value' update handler in order to unsync from it.
      this.firebaseObject.ref.off('value', this.updatedHandlerReference);
      this.firebaseObject = null;
      Object.keys(this, (v, k) => {
        delete this[k];
      });
    }
  }

  error (err) {
    if(this.firebaseObject) {
      console.error(err);
      // this.firebaseObject.error(err);
    }
  }

  init() {
    return new Promise((resolve, reject) => {
      if(this.isResolved) {
        resolve(this.firebaseObject);
      } else {
        this.updatedHandlerReference = this.firebaseObject.ref.on('value', snap => this.updated(snap), error => this.error(error));

        // Fetch data once to ensure we've resolved results
        this.firebaseObject.ref.once('value', snap => {
          if(_.isArray(snap.val())) {
            console.warn('Storing data using array indices in Firebase can result in unexpected behavior. See https://www.firebase.com/docs/web/guide/understanding-data.html#section-arrays-in-firebase for more information. Also note that you probably wanted $firebaseArray and not $firebaseObject.');
          }
          this.isResolved = true;
          resolve(this.firebaseObject);
        }, error => {
          this.isResolved = true;
          reject(error);
        });
      }
    });
  }

  /**
  * Called whenever an item is changed at the server.
  * This method must exist on any objectFactory passed into $firebase.
  *
  * It should return true if any changes were made, otherwise `$$notify` will
  * not be invoked.
  *
  * @param {object} snap a Firebase snapshot
  * @return {boolean} true if any changes were made.
  */
  updated(snap) {
    this.firebaseObject.utils.updateRec(this.firebaseObject, snap);
  }
}
