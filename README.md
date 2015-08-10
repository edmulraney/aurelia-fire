# aurelia-fire
A Firebase adapter plugin for Aurelia.

This plugin provides you with synchronized firebase arrays, objects and authentication. You'll need to install this plugin with jspm and then add it to your Aurelia startup as a plugin.

You can initialize a firebase object with a 'three-way-binding' to allow changes in the UI to automatically propagate to the firebase store, without requiring any save/update action. Use wisely.

Note: This is a work in progress and isn't stable. Breaking changes etc. etc.

# Install
```
jspm install aurelia-fire=github:edmulraney/angular-fire
```

# Usage

### FirebaseArray ###

```javascript
import Firebase from 'firebase';
import {FirebaseArray} from 'aurelia-fire';

export class Example {
  constructor(){
    this.ref = new Firebase('https://INSTANCE.firebaseio.com/people');
    this.people = [];
    this.array = new FirebaseArray(this.ref).then(result => this.people = result);
  }

  // Example: Add data - adding data to your local array, automatically synchronized to your firebase datastore
  add() {
    this.people.add({Id: 1, Name: 'John Doe'});
  }

  // Example: Remove data - removing data from your local array, automatically synchronized to your firebase datastore
  remove(id) {
    this.people.remove(id);
  }

  // Example: Update data - saving data to your local array, automatically synchronized to your firebase datastore
  update() {
    this.people[0].Name = "Jeff";
    this.people.save(this.people[0]);
  }
}
```

### FirebaseObject (Standard synchronized object) ###
```javascript
import Firebase from 'firebase';
import {FirebaseArray} from 'aurelia-fire';

export class Example {
  constructor(){
    this.ref = new Firebase('https://INSTANCE.firebaseio.com/people');
    this.person = {};
    this.obj = new FirebaseObject(this.ref).then(result => this.person = result);
  }

  update() {
    this.person.Name = "Jeff";
    this.person.save();
  }
}
```

### FirebaseObject (Three way binding) ###
```javascript
import Firebase from 'firebase';
import {FirebaseArray} from 'aurelia-fire';
import {ObserverLocator} from 'aurelia-framework';

export class Example {
  static inject = [ObserverLocator];
  constructor(observer){
    this.ref = new Firebase('https://INSTANCE.firebaseio.com/people');
    this.person = {};
    this.obj = new FirebaseObject(ref).then(result => result.bindTo(this, 'person', observer));
  }

  // No need for an 'update' method anymore, changes in the UI are automatically synchronized to firebase
  update() {
  }
}
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
