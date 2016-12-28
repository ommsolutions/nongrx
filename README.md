# nongrx
Basically a clone of [ngrx](https://github.com/ngrx/store) with all angular stripped away, so it can be used independently from a framework.
This project currently has no affiliation with the official ngrx-repository, all credit goes to the amazin ngrx-team - all this repository does, is providing ngrx-wrappers for non-angular-usecases.

## How it works
For the basic functionalities please have a look at the original repo at: [ngrx/store](https://github.com/ngrx/store)

## Basic Setup (inferno)
Please note that this is a simplified example setup, which works in many cases, a more sophisticated example is in development currently.

#### counter.reducer.ts
```typescript
import {Action} from "nongrx/store";

export const INCREMENT_BY: string = "[Counter] Increment by";

export const CounterReducer = (state = 0, action: Action): any => {
    switch(action.type) {
        case INCREMENT_BY:
            return state + (action.payload || 0);
    }
    
    return state;
};
```

#### store.ts
```typescript
import {registerStore} from "nongrx/store";
import {CounterReducer} from "../reducers";

export const store = registerStore(CounterReducer);
```

#### app.tsx
```tsx
import {render} from "inferno";
import * as createElement from "inferno-create-element";
import * as Component from "inferno-component";
import {Store, SetsState} from "nongrx/store";
import {Provider} from "nongrx/inferno";
import "rxjs/add/operator/map";
import {store} from "./store";
import {INCREMENT_BY} from "./counter.reducer.ts";

class App extends Component<{}, {store: Store<number>}> {
    store: Store<any> = this.context.store;

    @SetsState()
    counter: Observable<any> = this.store;

    @SetsState("myFanceStateVar")
    square: Observable<any> = this.store.map(x => x * x);

    constructor(public props, public context) {
        super(props, context);
    }

    clickedBtn(num: number = 1) {
        this.context.store.dispatch({type: INCREMENT_BY, payload: num});
    }

    render() {
        return (
            <div>
                <span>Count: {this.state.counter}</span>
                <span>Squared: {this.state.myFanceStateVar}</span>
                <br/>
                <button onClick={() => this.clickedBtn(1)}>Increment by 1</button>
                <br/>
                <button onClick={() => this.clickedBtn(2)}>Increment by 2</button>
            </div>
        );
    }
}

render(
    <Provider store={store}>
        <App/>
    </Provider>,
    document.getElementById("app")
);
```
---
## Combining multiple reducers to a single store
To achieve this, you simple can combine any reducers into an object:
#### store.ts
```typescript
import {registerStore} from "nongrx/store";
import {CategoriesReducer, UIReducer, ProductsReducer} from "../reducers";

export const store = registerStore({
    categories: CategoriesReducer,
    products: ProductsReducer,
    ui: UIReducer
});
```
To select the according data in the component, you can do the following:
```tsx
interface IProduct {
    name: string;
    category: string;
}

interface IAppState {
    categories: string[];
    products: {[key: number]: IProduct};
    ui: {
        selectedCategory: string;
    }
}

class App extends Component<{}, {store: Store<IAppState>}> {
    store: Store<any> = this.context.store;
    
    protected products$ = this.store
        .map(state => state.products)
        .distinctUntilChanged();

    protected categories$ = this.store
        .map(state => state.categories)
        .distinctUntilChanged();
    
    @SetsState("categoryOptions")
    protected categoriesAsOption$ = this.categories$
        .map(categories => categories.map(category => (<option value={category}>{category}</option>)));
    
    protected categoriesAsMap$ = this.categories$
        .map(categories => {
            let map = {};
            for (let category of categories) {
                map[category] = 0;
            }
            return map;
        });
        
    @SetsState("selectedCategory")
    protected selectedCategory$ = this.store
        .map(state => state.ui.selectedCategory)
        .filter(category => !!category) // filter out empty selection
        .distinctUntilChanged();

    protected productsPerCategory$ = Observable.combineLatest(
        this.categoriesAsMap$,
        this.products$
    )
        .map([categoriesMap, products] => {
            categoriesMap = {...categoriesMap};
            for (let product in products) {
                ++categoriesMap[product.category];
            }
            return categoriesMap;
        });

    @SetsState("productCount")
    numProductsForSelectedCategory$ = this.selectedCategory$
        .withLatestFrom(this.productsPerCategory$)
        .map([selectedCategory, productsPerCategory] => productsPerCategory[selectedCategory]);

    constructor(public props, public context) {
        super(props, context);
    }

    handleChange(event) {
        this.store.dispatch({type: SELECT_CATEGORY, payload: event.target.value});
    }

    render() {
        return (
            <div>
                <select value={this.state.selectedCategory} onChange={this.handleChange}>
                    {this.state.categoryOptions}
                </select>
                <br>
                Count: {this.state.productCount}
            </div>
        );
    }
}
```

---
## Effects
To use effects please have a look at the [@ngrx/effects-main-repo](https://github.com/ngrx/effects), as this is just a wrapper.

#### ping.effects.ts
```typescript
import {Effect, Actions} from "nongrx/effects";
import "rxjs/add/operator/mapTo";
import "rxjs/add/operator/delay";

export class PingEffects {
    constructor(private actions$: Actions) {}

    @Effect()
    pingResponse = this.actions$
        .ofType("ping")
        .delay(1000)
        .mapTo({type: "pong"});
}
```

#### store.ts
```typescript
import {registerStore} from "nongrx/store";
import {SomeReducer} from "../reducers";
import {CounterEffects} from "../effects";

const store = registerStore(SomeReducer);
store.addEffects(PingEffects);
```
