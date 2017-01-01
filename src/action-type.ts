// FROM: https://github.com/ngrx/example-app/blob/master/src/app/util.ts
/**
 * This function coerces a string into a string literal type.
 * Using tagged union types in TypeScript 2.0, this enables
 * powerful typechecking of our reducers.
 *
 * Since every action label passes through this function it
 * is a good place to ensure all of our action labels
 * are unique.
 */

const actionTypeCache: { [label: string]: boolean } = {};
export function actionType<T>(label: T | ''): T {
    if (actionTypeCache[<string>label]) {
        throw new Error(`Action type "${label}" is not unique"`);
    }

    actionTypeCache[<string>label] = true;

    return <T>label;
}