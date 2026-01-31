/**
 * Convert iterable (Map for example) to an array
 * @param iterable - Map or iterable to convert to array
 * @returns Array of items
 */
export const iterableToArray = (iterable: IterableIterator<unknown>): any[] => {
  const newArray = [];

  (function addItem(): void {
    const value = iterable.next();

    if (!value.done) {
      newArray.push(value.value);
      addItem();
    }
  }());

  return newArray;
};
