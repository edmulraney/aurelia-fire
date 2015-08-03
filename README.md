# aurelia-fire
A Firebase adapter for Aurelia

# Install
```
jspm install aurelia-fire=github:edmulraney/angular-fire
```

# Usage
```
import Firebase from 'firebase';
import {FirebaseArray} from 'aurelia-fire';

export class Example {
  constructor(){
    this.firebaseRef = new Firebase('https://INSTANCE.firebaseio.com/people');
    this.people = new FirebaseArray(this.firebaseRef);
  }

  add() {
    let id = Math.floor(Math.random() * 1000) + 1;
    let name = Math.random().toString(36).substring(7);
    this.people.add({Id: id, Name: name});
  }

  remove(id) {
    this.people.remove(id);
  }


  update() {
    this.people[0].Name = "rename-" + Math.random().toString(36).substring(5);
    this.people.save(this.people[0]);
  }
}
```

# Todo
- Tests
- FirebaseObject
- Authentication
- Extract FirebaseUtils into proper classes
- Documentation
