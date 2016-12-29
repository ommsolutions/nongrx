import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import {Subscription} from "rxjs/Subscription";
import "rxjs/add/operator/takeUntil";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/map";
import "rxjs/add/operator/do";
import "rxjs/add/operator/catch";
import "rxjs/add/observable/combineLatest";

const PROPERTY_KEY_PREFIX: string = "___nongrx.set-state.";
const CONFIG: string = PROPERTY_KEY_PREFIX + "config";

interface INongrxSetStateConfig {
    // maps each property-key to the corresponding state-key
    mappingList: [string, string | boolean][];
    unmounted$: Subject<any>;
    stream$: Observable<any[]>;
    makeSub: () => any;
    subscription: Subscription,
    observables: {[key: string]: Observable<any>}
}

export function SetsState(prop?: string | boolean) {
    return function (target: any, propertyKey: string) {
        Object.defineProperty(target, propertyKey, {
            set: function (value: any) {
                let config: INongrxSetStateConfig = this[CONFIG];
                if (!config) {
                    config = this[CONFIG] = <any>{
                        mappingList: [],
                        unmounted$: undefined,
                        observables: {},
                        subscription: undefined
                    }
                }

                // the target-key for the state, might be "true" to set the whole state
                let targetKey: string | boolean = prop || propertyKey;

                config.mappingList = [
                    // remove possible previous key-set
                    ...config.mappingList.filter(entry => entry[0] !== propertyKey),
                    // and add the new one
                    [propertyKey, targetKey]
                ];

                // "save" the stream
                config.observables[propertyKey] = value;

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

                config.stream$ = Observable.combineLatest(
                    config.mappingList.map(entry => config.observables[entry[0]].distinctUntilChanged())
                )
                    .takeUntil(config.unmounted$)
                    .debounceTime(0)
                    .map(propVals => {
                            let newState = {};
                            propVals
                                .map((val, i) => [config.mappingList[i][1], val])
                                .forEach(([target, val]) => target === true ? newState = {...newState, ...val} : newState[target] = val);
                            return newState;
                        }
                    )
                    .do(state => this.setState(state));

                if (!config.makeSub) {
                    config.makeSub = () => {
                        // remove previous subscription in case there was one
                        if (config.subscription) {
                            config.subscription.unsubscribe();
                            delete config.subscription;
                        }
                        config.subscription = config.stream$
                            .catch(() => config.stream$)
                            .subscribe();
                    };

                    if (this._unmounted && this.componentDidMount) {
                        let origMount = this.componentDidMount;
                        let that = this;
                        this.componentDidMount = function () {
                            config.makeSub();
                            origMount.call(that);
                        }
                    } else if (this._unmounted) {
                        this.componentDidMount = config.makeSub
                    }
                }

                if (!this._unmounted) {
                    config.makeSub();
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