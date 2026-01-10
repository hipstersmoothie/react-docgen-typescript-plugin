/** @type {import('prettier').Config} */
export default {
  printWidth: 120,
  singleQuote: true,
  plugins: ['@stzhu/prettier-plugin-tsconfig', '@trivago/prettier-plugin-sort-imports'],
  importOrder: ['^node:', '^[^.]', '^\\.'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
