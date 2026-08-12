import type { RowData } from '@tanstack/vue-table'

// 给列定义补一个 meta.cellClass,VirtualTable 用它决定单元格的宽度/截断策略。
declare module '@tanstack/vue-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    cellClass?: string
  }
}
