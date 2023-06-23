import {
  defineComponent,
  PropType,
  SetupContext,
  ref,
  reactive,
  computed,
  toRefs,
  watch,
} from '@vue/composition-api';
import upperFirst from 'lodash/upperFirst';
import pick from 'lodash/pick';
import get from 'lodash/get';
import { formatRowAttributes, formatRowClassNames } from './utils';
import { getRowFixedStyles } from './hooks/useFixed';
import { RowAndColFixedPosition } from './interface';
import useClassName from './hooks/useClassName';
import baseTableProps from './base-table-props';
import { getCellKey, SkipSpansValue } from './hooks/useRowspanAndColspan';
import useLazyLoad from '../hooks/useLazyLoad';
import { VirtualScrollConfig } from '../hooks/useVirtualScrollNew';
import {
  TableRowData, RowspanColspan, TdPrimaryTableProps, TdBaseTableProps,
} from './type';
import { AttachNode } from '../common';
import TD from './td';

export interface RenderTdExtra {
  rowAndColFixedPosition: RowAndColFixedPosition;
  columnLength: number;
  dataLength: number;
  cellSpans: RowspanColspan;
  cellEmptyContent: TdBaseTableProps['cellEmptyContent'];
}

export type TrCommonProps = Pick<TdPrimaryTableProps, TrPropsKeys>;

export const TABLE_PROPS = [
  'rowKey',
  'rowClassName',
  'columns',
  'fixedRows',
  'footData',
  'rowAttributes',
  'rowspanAndColspan',
  'scroll',
  'cellEmptyContent',
  'pagination',
  'attach',
  'onCellClick',
  'onRowClick',
  'onRowDblclick',
  'onRowMouseover',
  'onRowMousedown',
  'onRowMouseenter',
  'onRowMouseleave',
  'onRowMouseup',
] as const;

export type TrPropsKeys = (typeof TABLE_PROPS)[number];

export interface TrProps extends TrCommonProps {
  row: TableRowData;
  rowIndex: number;
  ellipsisOverlayClassName?: string;
  classPrefix?: string;
  dataLength?: number;
  rowAndColFixedPosition?: RowAndColFixedPosition;
  skipSpansMap?: Map<string, SkipSpansValue>;
  tableElm?: HTMLDivElement;
  scrollType?: string;
  isVirtual?: boolean;
  rowHeight?: number;
  trs?: Map<number, object>;
  bufferSize?: number;
  tableContentElm?: HTMLDivElement;
  cellEmptyContent?: TdBaseTableProps['cellEmptyContent'];
  virtualConfig: VirtualScrollConfig;
  attach?: AttachNode;
}

export const ROW_LISTENERS = ['click', 'dblclick', 'mouseover', 'mousedown', 'mouseenter', 'mouseleave', 'mouseup'];

const EMPTY_OBJECT = {};

// 表格行组件
export default defineComponent({
  name: 'TR',

  props: {
    row: Object as PropType<TableRowData>,
    rowIndex: Number,
    ellipsisOverlayClassName: String,
    classPrefix: String,
    dataLength: Number,
    rowAndColFixedPosition: Map as PropType<RowAndColFixedPosition>,
    // 合并单元格，是否跳过渲染
    skipSpansMap: Map as PropType<TrProps['skipSpansMap']>,
    virtualConfig: Object as PropType<TrProps['virtualConfig']>,
    ...pick(baseTableProps, TABLE_PROPS),
    // eslint-disabled-next-line
    tableElm: {},
    // eslint-disabled-next-line
    tableContentElm: {},
  },

  setup(props: TrProps, context: SetupContext) {
    const { tableContentElm } = toRefs(props);
    const trRef = ref(null);
    const {
      tdEllipsisClass,
      tableBaseClass,
      tableColFixedClasses,
      tableRowFixedClasses,
      tdAlignClasses,
      tableDraggableClasses,
    } = useClassName();

    const trStyles = computed(() => getRowFixedStyles(
      get(props.row, props.rowKey || 'id'),
      props.rowIndex,
      props.dataLength,
      props.fixedRows,
      props.rowAndColFixedPosition,
      tableRowFixedClasses,
    ));

    const trAttributes = computed(() => formatRowAttributes(props.rowAttributes, { row: props.row, rowIndex: props.rowIndex, type: 'body' }));

    const classes = computed(() => {
      const customClasses = formatRowClassNames(
        props.rowClassName,
        { row: props.row, rowIndex: props.rowIndex, type: 'body' },
        props.rowKey || 'id',
      );
      return [trStyles.value?.classes, customClasses];
    });

    const { hasLazyLoadHolder, tRowHeight } = useLazyLoad(tableContentElm, trRef, reactive({ ...props.scroll }));
    const getTrListeners = (row: TableRowData, rowIndex: number) => {
      const trListeners: { [eventName: string]: (e: MouseEvent) => void } = {};
      // add events to row
      ROW_LISTENERS.forEach((eventName) => {
        trListeners[eventName] = (e: MouseEvent) => {
          const p = { e, row, index: rowIndex };
          props[`onRow${upperFirst(eventName)}`]?.(p);
          // Vue3 ignore this line
          context.emit(`row-${eventName}`, p);
        };
      });
      return trListeners;
    };

    watch([trRef], () => {
      if (props.virtualConfig?.isVirtualScroll.value) {
        context.emit('row-mounted', {
          ref: trRef,
          data: props.row,
        });
      }
    });

    return {
      trRef,
      tableColFixedClasses,
      tableDraggableClasses,
      tdEllipsisClass,
      tableBaseClass,
      tdAlignClasses,
      trStyles,
      classes,
      trAttributes,
      tRowHeight,
      hasLazyLoadHolder,
      getTrListeners,
    };
  },

  render(h) {
    const {
      row, rowIndex, dataLength, rowAndColFixedPosition,
    } = this;
    const rowUniqueKey = get(row, this.rowKey || 'id');
    const columnVNodeList = this.columns?.map((col, colIndex) => {
      const cellSpans: RowspanColspan = {};
      let spanState = null;
      if (this.skipSpansMap.size) {
        const cellKey = getCellKey(row, this.rowKey, col.colKey, colIndex);
        spanState = this.skipSpansMap.get(cellKey) || {};
        spanState?.rowspan > 1 && (cellSpans.rowspan = spanState.rowspan);
        spanState?.colspan > 1 && (cellSpans.colspan = spanState.colspan);
        if (spanState.skipped) return null;
      }
      return (
        <TD
          key={`${rowUniqueKey}_${col.colKey}`}
          row={row}
          col={col}
          colIndex={colIndex}
          rowIndex={rowIndex}
          dataLength={dataLength}
          cellSpans={JSON.stringify(cellSpans)}
          rowAndColFixedPosition={rowAndColFixedPosition}
          cellEmptyContent={this.cellEmptyContent}
          rowspanAndColspan={this.rowspanAndColspan}
        />
      );
    });
    const attrs = this.trAttributes || EMPTY_OBJECT;
    return (
      <tr
        ref="trRef"
        attrs={attrs}
        style={this.trStyles?.style}
        class={this.classes}
        on={this.getTrListeners(row, rowIndex)}
      >
        {this.hasLazyLoadHolder ? [<td style={{ height: `${this.tRowHeight}px`, border: 'none' }} />] : columnVNodeList}
      </tr>
    );
  },
});
