import { Action } from '@ngrx/store/src/dispatcher';
import { Observable } from 'rxjs/Observable';
import { filter } from 'rxjs/operator/filter';

export class Actions extends Observable<Action> {
  constructor(actionsSubject: Observable<Action>) {
    super();
    this.source = actionsSubject;
  }

  lift(operator) {
    const observable = new Actions(this);
    observable.operator = operator;
    return observable;
  }

  ofType(...keys: string[]): Actions {
    return filter.call(this, ({ type }) => {
      const len = keys.length;
      if (len === 1) {
        return type === keys[0];
      } else {
        for (let i = 0; i < len; i++) {
          if (keys[i] === type) {
            return true;
          }
        }
      }
      return false;
    });
  }
}
