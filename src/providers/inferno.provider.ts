import Component from 'inferno-component';

export class Provider extends Component<any, any> {
    store: any;

    constructor(public props, public context?: any) {
        super(props, context);
        this.store = props.store;
    }

    getChildContext() {
        return { store: this.store };
    }

    render() {
        if (this.props.children == null || [].concat(this.props.children || []).length !== 1) {
            throw Error('Inferno Error: Only one child is allowed within the `Provider` component');
        }

        return this.props.children;
    }
}
