# aurelia-fire
A Firebase adapter plugin for Aurelia. Based on [AngularFire](https://www.firebase.com/docs/web/libraries/angular)

This plugin provides synchronized firebase arrays, objects and authentication. You'll need to install this plugin with jspm and then add it to your Aurelia startup as a plugin.

You can initialize a firebase object with a 'three-way-binding' to allow changes to the object to automatically propagate to the firebase store, without requiring any save/update action. Use wisely.

Note: This is a work in progress and isn't stable. Breaking changes etc. etc.

# Install
```
jspm install aurelia-fire=github:edmulraney/angular-fire
```

# Project status
## Working
- FirebaseArray
- FirebaseObject

## In progress
- FirebaseAuthentication

## Todo
- Tests
- Extract FirebaseUtils into proper classes
- Documentation
- Remove lodash dependency


# Usage

### FirebaseArray ###
Note: you must use the FirebaseArray methods to update your array:
- add()
- remove()
- save()

_Do not call splice(), push(), pop(), shift() directly._

```javascript
import Firebase from 'firebase';
import {FirebaseArray} from 'aurelia-fire';

export class Example {
  people = [];

  constructor(){
    this.ref = new Firebase('https://INSTANCE.firebaseio.com/people');
    this.array = new FirebaseArray(this.ref).then(result => this.people = result);
  }

  // Example: Adding data
  add() {
    this.people.add({Age: 27, Name: 'John Doe'});
  }

  // Example: Removing data
  remove() {
    // all array items store their unique Firebase Key in their $id property
    let exampleId = this.plants[0].$id;
    this.plants.remove(exampleId);
  }

  // Example: Updating data
  update() {
    let person = this.people[0];
    person.Name = "Joe Bloggs";
    person.Age = 23;
    this.people.save(person);
  }
}
```

### FirebaseObject (Standard synchronized object) ###
```javascript
import Firebase from 'firebase';
import {FirebaseObject} from 'aurelia-fire';

export class Example {  
  person = {};

  constructor() {
    this.ref = new Firebase('https://INSTANCE.firebaseio.com/people');
    this.person = {};
    this.obj = new FirebaseObject(this.ref).then(result => this.person = result);
  }

  update() {
    this.person.Name = "Thomas Hobbes";
    this.person.Age = 50;
    this.person.save();
  }
}
```

### FirebaseObject (Three way binding) ###
```javascript
import Firebase from 'firebase';
import {FirebaseObject} from 'aurelia-fire';
import {ObserverLocator} from 'aurelia-framework';

export class Example {
  static inject = [ObserverLocator];
  person = {};

  constructor(observer){
    this.ref = new Firebase('https://INSTANCE.firebaseio.com/people');
    this.obj = new FirebaseObject(ref).then(result => result.bindTo(this, 'person', observer));
  }

  // No need for an 'update' method anymore, changes in the UI are automatically synchronized to firebase
  update() {
  }
}
```
