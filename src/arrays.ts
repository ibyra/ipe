import type { EqualityComparison } from './commons';

/**
 * Checks if an array is equal to other array by checking if every element is
 * equal to another element at same index using a comparison function.
 *
 * @param arrayA An array to be compared from
 * @param arrayB An array to be compared to
 * @param equalsFn An function that compare each element
 * @returns `true` if all elements are equal, `false` otherwise.
 */
export function equals<A = unknown, B = unknown>(
  arrayA: ReadonlyArray<A>,
  arrayB: ReadonlyArray<B>,
  equalsFn: EqualityComparison<A | B> = Object.is,
): boolean {
  // @ts-expect-error Check if same reference
  if (arrayA === arrayB) return true;
  if (arrayA.length !== arrayB.length) return false;
  for (let index = 0; index < arrayA.length; index = index + 1) {
    const elementA = arrayA[index]!;
    const elementB = arrayB[index]!;
    if (!equalsFn(elementA, elementB)) return false;
  }
  return true;
}

/**
 * Creates unique array retaining first occurrence of elements.
 *
 * @param array The array to inspect
 * @param equality The comparison function
 * @returns A new array with unique items.
 */
export function unique<T>(
  array: ReadonlyArray<T>,
  equals: EqualityComparison<T> = Object.is,
): Array<T> {
  const result: Array<T> = [];
  for (const value of array) {
    if (!result.some((uniqueValue) => equals(uniqueValue, value))) {
      result.push(value);
    }
  }
  return result;
}
