import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import {Subscription} from "rxjs/Subscription";
import "rxjs/add/operator/takeUntil";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/map";
import "rxjs/add/operator/do";
import "rxjs/add/operator/catch";

const PROPERTY_KEY_PREFIX: string = "___nongrx.set-state.";
const CONFIG: string = PROPERTY_KEY_PREFIX + "config";

interface INongrxInfernoSetsStateConfig {
    unmounted$: Subject<any>;
    subscriptions: {[key: string]: Subscription},
    observables: {[key: string]: Observable<any>}
}

export function SetsState(prop?: string | boolean, sync: boolean = false) {
    return function (target: any, propertyKey: string) {
        Object.defineProperty(target, propertyKey, {
            set: function (value: any) {
                let config: INongrxInfernoSetsStateConfig = this[CONFIG];
                if (!config) {
                    config = this[CONFIG] = <any>{
                        mappingList: [],
                        unmounted$: undefined,
                        observables: {},
                        subscriptions: {}
                    }
                }

                if (config.unmounted$ == null) {
                    config.unmounted$ = new Subject();
                    if (this.componentWillUnmount) {
                        let origUnmount = this.componentWillUnmount;
                        let that = this;
                        this.componentWillUnmount = function () {
                            config.unmounted$.next(true);
                            origUnmount.call(that);
                        }
                    } else {
                        this.componentWillUnmount = function () {
                            config.unmounted$.next(true);
                        }
                    }
                }

                // the target-key for the state, might be "true" to set the whole state
                let targetKey: string | boolean = prop || propertyKey;

                // "save" the stream
                config.observables[propertyKey] = value;
                let stream$ = value
                    .takeUntil(config.unmounted$)
                    .do(state => {
                        let newState: any = targetKey === true ? state : {[<string>targetKey]: state};
                        if (sync === true) {
                            this.setStateSync(newState);
                        } else {
                            this.setState(newState);
                        }
                    });

                const makeSub = () => {
                    // remove previous subscription in case there was one
                    if (config.subscriptions[propertyKey]) {
                        config.subscriptions[propertyKey].unsubscribe();
                        delete config.subscriptions[propertyKey];
                    }
                    config.subscriptions[propertyKey] = stream$
                        .subscribe(
                            undefined,
                            error => console.error(error)
                        );
                };

                if (this._unmounted && this.componentDidMount) {
                    let origMount = this.componentDidMount;
                    let that = this;
                    this.componentDidMount = function () {
                        makeSub();
                        origMount.call(that);
                    }
                } else if (this._unmounted) {
                    this.componentDidMount = makeSub
                } else {
                    makeSub();
                }
            },
            get: function (): any {
                return this[CONFIG].observables[propertyKey];
            },
            enumerable: true,
            configurable: true
        });
    }
}