import {FirebaseUtils} from './firebase-utils';
import {ObjectSyncManager} from './object-sync-manager';
import {ThreeWayBinding} from './three-way-binding';

export class FirebaseObject {

  constructor(ref) {
    this._utils = new FirebaseUtils();
    this._ref = ref;
    this._isDestroyed = false;
    this.$id = this._utils.getKey(this.ref.ref());
    this.$priority = null;
    this.$value = null;

    this._sync = new ObjectSyncManager(this);
    // Optional three way bind (auto-syncs with Firebase DB)
    this._binding = new ThreeWayBinding(this);

    return this._sync.init();
  }

  /**
   * @returns {Firebase} the original Firebase instance used to create this object.
   */
  get ref() {
    return this._ref;
  }

  get utils() {
    return this._utils;
  }

  /**
   * Saves all data on the FirebaseObject back to Firebase.
   * @returns a promise which will resolve after the save is completed.
   */
  save() {
    let data = this.utils.toJSON(this);
    return this.utils.doSet(this.ref, data).then(() => {
      return this.ref.ref();
    });
  }

  /**
   * Removes all keys from the FirebaseObject and also removes
   * the remote data from the server.
   *
   * @returns a promise which will resolve the Firebase reference
   */
  remove() {
    this.utils.trimKeys(this, {});
    this.value = null;
    return this.utils.doRemove(this.ref.ref()).then(() => {
      return this.ref.ref();
    });
  }

  /**
   * Creates a 3-way data sync between this object, the Firebase server, and a
   * view-model property. This means that any changes made to the view-model property are
   * pushed to Firebase, and vice versa.
   *
   * If scope emits a $destroy event, the binding is automatically severed.
   *
   * Can only be bound to one scope variable at a time. If a second is attempted,
   * the promise will be rejected with an error.
   *
   * @param {object} context
   * @param {string} property
   * @returns a promise which resolves to an unbind method after data is set in scope
   */
  bindTo(context, property, observer) {
    return this._binding.bindTo(context, property, observer, this.save.bind(this));
  }

  /**
   * Informs $firebase to stop sending events and clears memory being used
   * by this object (delete's its local content).
   */
  destroy(err) {
    if (!this._isDestroyed) {
      this._isDestroyed = true;
      this._sync.destroy(err);
      this._binding.destroy();
      this.utils.each(this, (v, k) => {
        this[k] = undefined;
        delete this[k];
      });
      this.save = this.remove = this.bindTo = undefined;
    }
  }
}
