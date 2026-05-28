export function isEqual(value, other) {
  const memo = new Map();

  function deepCompare(a, b) {
    if (Object.is(a, b)) return true;

    if (
      typeof a !== "object" ||
      a === null ||
      typeof b !== "object" ||
      b === null
    ) {
      return a !== a && b !== b;
    }

    const tagA = Object.prototype.toString.call(a);
    const tagB = Object.prototype.toString.call(b);
    if (tagA !== tagB) return false;

    if (memo.has(a) && memo.get(a) === b) return true;
    memo.set(a, b);

    switch (tagA) {
      case "[object Date]":
        return +a === +b;

      case "[object RegExp]":
        return a.toString() === b.toString();

      case "[object Number]":
      case "[object Boolean]":
      case "[object String]":
        return Object.is(a.valueOf(), b.valueOf());

      case "[object Map]": {
        if (a.size !== b.size) return false;
        for (const [key, val] of a.entries()) {
          if (!b.has(key) || !deepCompare(val, b.get(key))) return false;
        }
        return true;
      }

      case "[object Set]": {
        if (a.size !== b.size) return false;
        const arrA = Array.from(a);
        const arrB = Array.from(b);
        return deepCompare(arrA, arrB);
      }

      case "[object Array]": {
        const length = a.length;
        if (length !== b.length) return false;
        for (let i = 0; i < length; i++) {
          if (!deepCompare(a[i], b[i])) return false;
        }
        return true;
      }

      case "[object Object]": {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
          if (
            !Object.prototype.hasOwnProperty.call(b, key) ||
            !deepCompare(a[key], b[key])
          ) {
            return false;
          }
        }
        return true;
      }

      default:
        if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
          if (a.byteLength !== b.byteLength) return false;
          return a.toString() === b.toString();
        }
        return false;
    }
  }

  return deepCompare(value, other);
}
