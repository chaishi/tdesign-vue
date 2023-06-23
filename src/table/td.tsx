import { CreateElement } from 'vue';
import { defineComponent, SetupContext, h, computed, PropType } from '@vue/composition-api';
import isString from 'lodash/isString';
import isFunction from 'lodash/isFunction';
import get from 'lodash/get';
import { PaginationProps } from '../pagination';
import useClassName from './hooks/useClassName';
import { getColumnFixedStyles } from './hooks/useFixed';
import { formatClassNames } from './utils';
import TEllipsis from './ellipsis';
import {
  BaseTableCol,
  BaseTableCellParams,
  TableRowData,
  TdBaseTableProps,
  TableRowspanAndColspanFunc,
  RowspanColspan,
} from './type';
import { RowAndColFixedPosition } from './interface';
import { ClassName } from '../common';

export function renderCell(
  params: BaseTableCellParams<TableRowData>,
  slots: SetupContext['slots'],
  extra?: {
    cellEmptyContent?: TdBaseTableProps['cellEmptyContent'];
    pagination?: PaginationProps;
  },
) {
  const { col, row, rowIndex } = params;
  // support serial number column
  if (col.colKey === 'serial-number') {
    const {
      current, pageSize, defaultCurrent, defaultPageSize,
    } = extra?.pagination || {};
    const tCurrent = current || defaultCurrent;
    const tPageSize = pageSize || defaultPageSize;
    if (tPageSize && tCurrent) {
      return tPageSize * (tCurrent - 1) + rowIndex + 1;
    }
    return rowIndex + 1;
  }
  if (isFunction(col.cell)) {
    return col.cell(h, params);
  }
  if (slots[col.colKey]) {
    return slots[col.colKey](params);
  }
  if (isString(col.cell) && slots[col.cell]) {
    return slots[col.cell](params);
  }
  if (isFunction(col.render)) {
    return col.render(h, { ...params, type: 'cell' });
  }
  const r = get(row, col.colKey);
  // 0 和 false 属于正常可用之，不能使用兜底逻辑 cellEmptyContent
  if (![undefined, '', null].includes(r)) return r;
  // cellEmptyContent 作为空数据兜底显示，用户可自定义
  if (extra?.cellEmptyContent) {
    return isFunction(extra.cellEmptyContent) ? extra.cellEmptyContent(h, params) : extra.cellEmptyContent;
  }
  const hParams = h;
  Object.assign(hParams, params || {});
  if (slots.cellEmptyContent) {
    return slots.cellEmptyContent(hParams);
  }
  if (slots['cell-empty-content']) {
    return slots['cell-empty-content'](hParams);
  }
  return r;
}

export interface RenderEllipsisCellParams {
  cellNode: any;
}

export default defineComponent({
  name: 'TD',
  
  props: {
    row: Object as PropType<TableRowData>,
    col: [Object] as PropType<BaseTableCol>,
    colIndex: Number,
    rowIndex: Number,
    dataLength: Number,
    // JSON String: Object as PropType<RowspanColspan>,
    cellSpans: String,
    rowAndColFixedPosition: Map as PropType<RowAndColFixedPosition>,
    cellEmptyContent: [String, Function] as PropType<TdBaseTableProps['cellEmptyContent']>,
    rowspanAndColspan: Function as PropType<TableRowspanAndColspanFunc<TableRowData>>,
    onCellClick: Function,
  },

  setup(props, context) {
    const {
      tdEllipsisClass,
      tableBaseClass,
      tdAlignClasses,
      tableDraggableClasses,
      tableColFixedClasses,
    } = useClassName();

    const tdStyles = computed(() => (
      getColumnFixedStyles(props.col, props.colIndex, props.rowAndColFixedPosition, tableColFixedClasses)
    ));

    const params = computed(() => ({
      row: props.row,
      col: props.col,
      colIndex: props.colIndex,
      rowIndex: props.rowIndex,
    }));

    const customClasses = computed(() => {
      const col = props.col as BaseTableCol;
      return formatClassNames(col.className, {
        ...params.value,
        type: 'td',
      })
    });

    const innerCellSpans = computed<RowspanColspan>(() => (
      props.cellSpans ? JSON.parse(props.cellSpans) : {}
    ));

    const classes = computed(() => {
      const { rowIndex, colIndex, dataLength, rowspanAndColspan } = props;
      const col = props.col as BaseTableCol;
      const classNames: ClassName = [
        tdStyles.value.classes,
        customClasses,
        {
          [tdEllipsisClass]: col.ellipsis,
          [tableBaseClass.tdLastRow]: rowIndex + innerCellSpans.value.rowspan === dataLength,
          [tableBaseClass.tdFirstCol]: colIndex === 0 && rowspanAndColspan,
          [tdAlignClasses[col.align]]: col.align && col.align !== 'left',
          // 标记可拖拽列
          [tableDraggableClasses.handle]: col.colKey === 'drag',
        },
      ];
      return classNames;
    });

    const onClick = (e: MouseEvent) => {
      const p = { ...params, e };
      const col = props.col as BaseTableCol;
      if (col.stopPropagation) {
        e.stopPropagation();
      }
      props.onCellClick?.(p);
      // Vue3 ignore this line
      context.emit('cell-click', p);
    };

    const attrs = computed<{ [key: string]: any }>(() => {
      const col = props.col as BaseTableCol;
      const normalAttrs = isFunction(col.attrs) ? col.attrs({ ...params.value, type: 'td' }) : col.attrs;
      return { ...normalAttrs, ...innerCellSpans.value };
    });

    return {
      classes,
      tdStyles,
      attrs,
      params,
      onClick,
    };
  },

  methods: {
    renderEllipsisCell(
      h: CreateElement,
      cellParams: BaseTableCellParams<TableRowData>,
      params: RenderEllipsisCellParams,
    ) {
      const { cellNode } = params;
      const { col } = cellParams;
      let content = isFunction(col.ellipsis) ? col.ellipsis(h, cellParams) : undefined;
      if (typeof col.ellipsis === 'object' && isFunction(col.ellipsis.content)) {
        content = col.ellipsis.content(h, cellParams);
      }
      let tooltipProps = {};
      if (typeof col.ellipsis === 'object') {
        tooltipProps = 'props' in col.ellipsis ? col.ellipsis.props : col.ellipsis || undefined;
      }
      return (
        <TEllipsis
          placement={'top'}
          attach={this.attach || (this.tableElm ? () => this.tableElm : undefined)}
          tooltipContent={content && (() => content)}
          tooltipProps={tooltipProps}
          overlayClassName={this.ellipsisOverlayClassName}
          classPrefix={this.classPrefix}
        >
          {cellNode}
        </TEllipsis>
      );
    },
  },

  render() {
    const { row, colIndex, rowIndex, cellEmptyContent } = this;
    const col = this.col as BaseTableCol;
    const cellNode = renderCell({
      row, col, colIndex, rowIndex,
    }, this.$scopedSlots, {
      cellEmptyContent,
      pagination: this.pagination,
    });
    return (
      <td class={this.classes} attrs={this.attrs} style={{ ...this.tdStyles.style, ...this.attrs.style }} onClick={this.onClick}>
        {col.ellipsis ? this.renderEllipsisCell(h, this.params, { cellNode }) : cellNode}
      </td>
    );
  },
});
