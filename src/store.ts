import { Reducer, ActionReducer } from '@ngrx/store/src/reducer';
import { Dispatcher } from '@ngrx/store/src/dispatcher';
import { Store as NgStore } from '@ngrx/store/src/store';
import { State } from '@ngrx/store/src/state';
import { combineReducers } from '@ngrx/store/src/utils';
import { mergeEffects } from './effects';
import { Actions } from './actions';
import { merge } from 'rxjs/observable/merge';
import { Subscription } from 'rxjs/Subscription';

export interface IRootReducer<T> {
    [key: string]: ActionReducer<any>;
}

export class Store<T> extends NgStore<T> {
    public actions$: Actions;

    private effectsSubscription: Subscription = new Subscription();

    constructor(dispatcher, reducer, state$) {
        super(dispatcher, reducer, state$);
        this.actions$ = new Actions(dispatcher);
    }

    public addEffects(...effectsClasses: any[]): void {
        const sources = effectsClasses
            .map(clazz => new clazz(this.actions$))
            .map(mergeEffects);
        const merged = merge(...sources);

        this.effectsSubscription.add(merged.subscribe(this));
    }
}

function _initialReducerFactory(reducer) {
    if (typeof reducer === 'function') {
        return reducer;
    }
    return combineReducers(reducer);
}

function _initialStateFactory(initialState, reducer) {
    if (!initialState) {
        return reducer(undefined, { type: Dispatcher.INIT });
    }
    return initialState;
}

function _storeFactory(dispatcher, reducer, state$) {
    return new Store(dispatcher, reducer, state$);
}

function _stateFactory(initialState: any, dispatcher: Dispatcher, reducer: Reducer) {
    return new State(initialState, dispatcher, reducer);
}

function _reducerFactory(dispatcher, reducer) {
    return new Reducer(dispatcher, reducer);
}

export function registerStore<T>(actionReducer: ActionReducer<T> | IRootReducer<T>, initialState?: T): Store<T> {
    actionReducer = _initialReducerFactory(actionReducer);
    initialState = _initialStateFactory(initialState, actionReducer);

    const dispatcher = new Dispatcher();
    const reducer = _reducerFactory(dispatcher, actionReducer);
    const state = _stateFactory(initialState, dispatcher, reducer);
    return _storeFactory(dispatcher, reducer, state);
}
