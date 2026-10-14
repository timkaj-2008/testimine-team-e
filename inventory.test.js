const { restock, pick, findDuplicateSkus } = require('./inventory');

// Functional test
test('REQ-01 restock adds deliveries to existing sku and adds an unknown sku', () => {
  expect(restock({ 'A-1': 5 }, [
    { sku: 'A-1', qty: 3 },
    { sku: 'B-2', qty: 4 },
  ])).toEqual({ 'A-1': 8, 'B-2': 4 });
});

// Functional test
test('REQ-02 restock returns a new object and leaves the original unchanged', () => {
  const stock = { 'A-1': 5 };
  const result = restock(stock, [{ sku: 'A-1', qty: 2 }]);
  expect(result).not.toBe(stock);
  expect(result).toEqual({ 'A-1': 7 });
  expect(stock).toEqual({ 'A-1': 5 });
});

// Functional test
test('REQ-03 restock accepts quantity 1', () => {
  expect(restock({}, [{ sku: 'A-1', qty: 1 }])).toEqual({ 'A-1': 1 });
});

// Functional test
test.each([0, -1, 2.5, NaN, '2'])('REQ-03 restock rejects invalid quantity %s', (qty) => {
  expect(() => restock({ 'A-1': 5 }, [{ sku: 'A-1', qty }])).toThrow('qty must be a positive whole number');
});

// Functional test
test('REQ-04 pick reduces quantity and returns a new object', () => {
  const stock = { 'A-1': 5, 'B-2': 1 };
  const result = pick(stock, 'A-1', 2);
  expect(result).not.toBe(stock);
  expect(result).toEqual({ 'A-1': 3, 'B-2': 1 });
  expect(stock).toEqual({ 'A-1': 5, 'B-2': 1 });
});

// Functional test
test('REQ-04 pick rejects an unknown sku', () => {
  expect(() => pick({ 'A-1': 5 }, 'B-2', 1)).toThrow('unknown sku');
});

// Functional test
test('REQ-04 pick rejects quantity greater than available stock', () => {
  expect(() => pick({ 'A-1': 5 }, 'A-1', 6)).toThrow('not enough stock');
});

// Functional test
test.each([0, -1, 1.5])('REQ-04 pick rejects invalid quantity %s', (qty) => {
  expect(() => pick({ 'A-1': 5 }, 'A-1', qty)).toThrow('not enough stock');
});

// Functional test
test('REQ-05 findDuplicateSkus returns each duplicated sku once and ignores unique skus', () => {
  const items = [
    { sku: 'A-1' }, { sku: 'B-2' }, { sku: 'A-1' },
    { sku: 'C-3' }, { sku: 'B-2' }, { sku: 'B-2' },
  ];
  expect(findDuplicateSkus(items)).toEqual(['A-1', 'B-2']);
});

// Functional test
test('REQ-05 findDuplicateSkus returns an empty array when there are no duplicates', () => {
  expect(findDuplicateSkus([{ sku: 'A-1' }, { sku: 'B-2' }])).toEqual([]);
});

// Performance test
test('REQ-06 findDuplicateSkus handles 20 000 items under 100 ms', () => {
  const items = Array.from({ length: 20000 }, (_, i) => ({ sku: `SKU-${i % 19000}` }));
  const startedAt = performance.now();
  findDuplicateSkus(items);
  const elapsedMs = performance.now() - startedAt;
  expect(elapsedMs).toBeLessThan(100);
});

// Security test
test.each([
  ['<script>alert(1)</script>', 'HTML injection'],
  ['A'.repeat(21), 'sku too long'],
  ['SKU 1', 'space'],
  ['A-1\n', 'trailing newline'],
  [123, 'not a string'],
  ['', 'empty string'],
  ["'; DROP TABLE stock; --", 'SQL injection'],
  ['A_B', 'underscore'],
])('REQ-07 restock rejects unsafe sku (%s: %s)', (sku) => {
  expect(() => restock({}, [{ sku, qty: 1 }])).toThrow('invalid sku');
});


// Security test
test.each([
  ['A-1', 'valid sku'],
  ['12345678901234567890', '20 characters'],
])('REQ-07 restock accepts valid sku (%s: %s)', (sku) => {
  expect(restock({}, [{ sku, qty: 1 }])).toEqual({ [sku]: 1 });
});


// Security test
test.each([
  ['<script>alert(1)</script>', 'HTML injection'],
  ['A'.repeat(21), 'sku too long'],
  ['SKU 1', 'space'],
  ['A-1\n', 'trailing newline'],
  [123, 'not a string'],
  ['', 'empty string'],
  ["'; DROP TABLE stock; --", 'SQL injection'],
  ['A_B', 'underscore'],
])('REQ-07 pick rejects unsafe sku (%s: %s)', (sku) => {
  expect(() => pick({}, sku, 1)).toThrow('invalid sku');
});

// Reliability test
test('REQ-08 failed restock leaves original stock unchanged after a prior valid delivery', () => {
  const stock = { 'A-1': 5 };
  expect(() => restock(stock, [
    { sku: 'A-1', qty: 1 },
    { sku: 'B-2', qty: 0 },
  ])).toThrow('qty must be a positive whole number');
  expect(stock).toEqual({ 'A-1': 5 });
});


// Reliability test
test('REQ-08 failed pick leaves original stock unchanged', () => {
  const stock = { 'A-1': 5 };
  expect(() => pick(stock, 'A-1', 6)).toThrow('not enough stock');
  expect(stock).toEqual({ 'A-1': 5 });
});

