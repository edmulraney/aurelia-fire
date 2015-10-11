export class ThreeWayBinding {
  constructor(firebaseObject) {
    this.firebaseObject = firebaseObject;
    this.dispose = null;
  }

  bindTo(context, property, observer, callback) {
    context[property] = this.firebaseObject;
    // Using ArrayObserver because there is no ObjectObserver at the time of writing this.
    // ArrayObserver correctly triggers change notifications on our Object.
    this.dispose = observer.getArrayObserver(context[property]).subscribe(changes => {
      callback();
    });
  }

  destroy() {
    this.dispose();
    this.firebaseObject = null;
  }
}
