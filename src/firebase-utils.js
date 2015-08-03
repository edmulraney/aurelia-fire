import _ from 'lodash';

export class FirebaseUtils {
  constructor() {
  }

  doRemove(ref) {
    return new Promise(resolve => {
      if(_.isFunction(ref.remove)) {
        // ref is not a query, just do a flat remove
        ref.remove(resolve);
      } else {
        // ref is a query so let's only remove the
        // items in the query and not the entire path
        ref.once('value', snap => snap.forEach(ss => ss.ref().remove()));
      }
    });
  }

  doSet(ref, data) {
    return new Promise((resolve, reject) => {
       if(_.isFunction(ref.set) || !_.isObject(data)) {
         // this is not a query, just do a flat set
         ref.set(data, resolve);
       }
       else {
         let dataCopy = _.extend({}, data);
         // this is a query, so we will replace all the elements
         // of this query with the value provided, but not blow away
         // the entire Firebase path
         ref.once('value', snap => { snap.forEach(ss => {
             if(!dataCopy.hasOwnProperty(this.getKey(ss))) {
               dataCopy[this.getKey(ss)] = null;
             }
           });
           ref.ref().update(dataCopy, resolve);
         }, reject);
       }
     });
   }

  getPrototypeMethods(inst, iterator, context) {
    let methods = {};
    let objProto = Object.getPrototypeOf({});
    let proto = _.isFunction(inst) && _.isObject(inst.prototype)?
      inst.prototype : Object.getPrototypeOf(inst);
    while(proto && proto !== objProto) {
      for (var index in Object.getOwnPropertyNames(proto)) {
        let key = Object.getOwnPropertyNames(proto)[index];
        // we only invoke each key once; if a super is overridden it's skipped here
        if (proto.hasOwnProperty(key) && !methods.hasOwnProperty(key)) {
          methods[key] = true;
          iterator.call(context, proto[key], key, proto);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
  }

  getPublicMethods(inst, iterator, context) {
    this.getPrototypeMethods(inst, (m, k) => {
      if( typeof(m) === 'function' && k.charAt(0) !== '_' ) {
        iterator.call(context, m, k);
      }
    });
  }

  each(obj, iterator, context) {
    if(obj === Object(obj)) {
      for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
          var c = k.charAt(0);
          if( c !== '_' && c !== '$' && c !== '.' ) {
            iterator.call(context, obj[k], k, obj);
          }
        }
      }
    }
    else if(Array.isArray(obj)) {
      for(var i = 0, len = obj.length; i < len; i++) {
        iterator.call(context, obj[i], i, obj);
      }
    }
    return obj;
  }

  trimKeys(dest, source) {
    this.each(dest, (v,k) => {
      if(!source.hasOwnProperty(k)) {
        delete dest[k];
      }
    });
    // for(key in dest) {
    //   if(!source.hasOwnProperty(key)) {
    //     delete dest[key];
    //   }
    // }
  }

  /**
   * A utility for retrieving a Firebase reference or DataSnapshot's
   * key name.
   */
  getKey(refOrSnapshot) {
    return refOrSnapshot.key();
  }

  updateRec(rec, snap) {
    let data = snap.val();
    let oldData = _.extend({}, rec);

    // deal with primitives
    if(!_.isObject(data)) {
      rec.$value = data;
      data = {};
    } else {
      delete rec.$value;
    }

    // apply changes: remove old keys, insert new data, set priority
    this.trimKeys(rec, data);
    _.extend(rec, data);//.$value = data;
    rec.$priority = snap.getPriority();

    return !areEqual(oldData, rec) ||
      oldData.$value !== rec.$value ||
      oldData.$priority !== rec.$priority;
  }


  /**
   * A utility for converting records to JSON objects
   * which we can save into Firebase. It asserts valid
   * keys and strips off any items prefixed with $.
   *
   * If the rec passed into this method has a toJSON()
   * method, that will be used in place of the custom
   * functionality here.
   *
   * @param rec
   * @returns {*}
   */
  toJSON(rec) {
    let data = {};
    if(!_.isObject(rec)) {
      rec = {$value: rec};
    }
    if (_.isFunction(rec.toJSON)) {
      data = rec.toJSON();
    }
    else {
      this.each(rec, (v, k) => {
        data[k] = this.stripDollarPrefixedKeys(v);
      });
    }
    if(!_.isUndefined(rec.$value) && Object.keys(data).length === 0 && rec.$value !== null) {
      data['.value'] = rec.$value;
    }
    if(!_.isUndefined(rec.$priority) && Object.keys(data).length > 0 && rec.$priority !== null) {
      data['.priority'] = rec.$priority;
    }
    _.forEach(data, (v,k) => {
      if (k.match(/[.$\[\]#\/]/) && k !== '.value' && k !== '.priority' ) {
        throw new Error('Invalid key ' + k + ' (cannot contain .$[]#)');
      }
      else if(_.isUndefined(v)) {
        throw new Error('Key '+k+' was undefined. Cannot pass undefined in JSON. Use null instead.');
      }
    });
    return data;
  }

  areEqual(obj1, obj2) {
  	return Object.keys(obj1).every((key) => obj2.hasOwnProperty(key) && (obj1[key] === obj2[key]));
  }

  stripDollarPrefixedKeys(data) {
    if(!_.isObject(data) ) { return data; }
    let out = _.isArray(data)? [] : {};
    data.forEach((v,k) => {
      if(typeof k !== 'string' || k.charAt(0) !== '$') {
        out[k] = this.stripDollarPrefixedKeys(v);
      }
    });
    return out;
  }
}
