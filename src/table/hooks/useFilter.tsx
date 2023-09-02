import {
  SetupContext, toRefs, ref, watch, computed,
} from '@vue/composition-api';
import { CreateElement } from 'vue';
import useClassName from './useClassName';
import TButton from '../../button';
import {
  TdPrimaryTableProps, PrimaryTableCol, TableRowData, FilterValue,
} from '../type';
import useDefaultValue from '../../hooks/useDefaultValue';
import { useTNodeDefault } from '../../hooks/tnode';
import TableFilterController from '../filter-controller';
import { useConfig } from '../../hooks/useConfig';

function isFilterValueExist(value: any) {
  const isArrayTrue = value instanceof Array && value.length;
  const isObject = typeof value === 'object' && !(value instanceof Array);
  const isObjectTrue = isObject && Object.keys(value).length;
  return isArrayTrue || isObjectTrue || !['null', '', 'undefined'].includes(String(value));
}

// 筛选条件不为空，才需要显示筛选结果行
function filterEmptyData(data: FilterValue) {
  const newFilterValue: FilterValue = {};
  Object.keys(data).forEach((key) => {
    const item = data[key];
    if (isFilterValueExist(item)) {
      newFilterValue[key] = item;
    }
  });
  return newFilterValue;
}

export default function useFilter(props: TdPrimaryTableProps, context: SetupContext) {
  const primaryTableRef = ref(null);
  const { t, global } = useConfig('table');
  const renderTNode = useTNodeDefault();
  const { filterValue, columns } = toRefs(props);
  const { tableFilterClasses, isFocusClass } = useClassName();
  const isTableOverflowHidden = ref<boolean>();

  // unControl and control
  const [tFilterValue, setTFilterValue] = useDefaultValue(
    filterValue,
    props.defaultFilterValue,
    props.onFilterChange,
    'filterValue',
    'filter-change',
  );

  // 过滤内部值
  const innerFilterValue = ref<FilterValue>(tFilterValue.value);

  const hasEmptyCondition = computed(() => {
    const filterEmpty = filterEmptyData(tFilterValue.value || {});
    return !tFilterValue.value || !Object.keys(filterEmpty).length;
  });

  watch([tFilterValue], ([val]) => {
    innerFilterValue.value = val;
  });

  // eslint-disable-next-line
  function renderFirstFilterRow(h: CreateElement) {
    if (hasEmptyCondition.value) return null;
    const defaultNode = (
      <div class={tableFilterClasses.result}>
        {/* <span>搜索 “{getFilterResultContent()}”，</span>
        <span>找到 {props.pagination?.total || props.data?.length} 条结果</span> */}
        {t(global.value.searchResultText, {
          result: getFilterResultContent(),
          count: props.pagination?.total || props.data?.length,
        })}
        <TButton theme="primary" variant="text" onClick={onResetAll}>
          {global.value.clearFilterResultButtonText}
        </TButton>
      </div>
    );
    const filterContent = renderTNode('filterRow');
    if ((props.filterRow && !filterContent) || props.filterRow === null) return null;
    return <div class={tableFilterClasses.inner}>{filterContent || defaultNode}</div>;
  }

  // 获取搜索条件内容，存在 options 需要获取其 label 显示
  function getFilterResultContent(): string {
    const arr: string[] = [];
    props.columns
      .filter((col) => col.filter)
      .forEach((col) => {
        let value = tFilterValue.value[col.colKey];
        if (col.filter.list && !['null', '', 'undefined'].includes(String(value))) {
          const formattedValue = value instanceof Array ? value : [value];
          const label: string[] = [];
          col.filter.list.forEach((option) => {
            if (formattedValue.includes(option.value)) {
              label.push(option.label);
            }
          });
          value = label.join();
        }
        if (isFilterValueExist(value)) {
          arr.push(`${col.title}：${value}`);
        }
      });
    return arr.join('；');
  }

  function onInnerFilterChange(val: any, column: PrimaryTableCol) {
    const filterValue = {
      ...innerFilterValue.value,
      [column.colKey]: val,
    };
    innerFilterValue.value = filterValue;
    if (!column.filter.showConfirmAndReset) {
      emitFilterChange(filterValue, column);
    }
  }

  function emitFilterChange(filterValue: FilterValue, column?: PrimaryTableCol) {
    setTFilterValue(filterValue, { col: column });

    props.onChange?.({ filter: filterValue }, { trigger: 'filter' });
    // Vue3 ignore next line
    context.emit('change', { filter: filterValue }, { trigger: 'filter' });
  }

  function onReset(column: PrimaryTableCol) {
    const filterValue: FilterValue = {
      ...tFilterValue.value,
      [column.colKey]:
        column.filter.resetValue
        ?? {
          single: '',
          multiple: [],
          input: '',
        }[column.filter.type]
        ?? '',
    };
    emitFilterChange(filterValue, column);
  }

  function onResetAll() {
    const resetValue: { [key: string]: any } = {};
    columns.value.forEach((col) => {
      if (col.filter && 'resetValue' in col.filter) {
        resetValue[col.colKey] = col.filter.resetValue;
      }
    });
    emitFilterChange(resetValue, undefined);
  }

  function onConfirm(column: PrimaryTableCol) {
    emitFilterChange(innerFilterValue.value, column);
  }

  // 图标：内置图标，组件自定义图标，全局配置图标
  function renderFilterIcon(
    h: CreateElement,
    { col, colIndex }: { col: PrimaryTableCol<TableRowData>; colIndex: number },
  ) {
    return (
      <TableFilterController
        scopedSlots={{ filterIcon: context.slots.filterIcon }}
        column={col}
        colIndex={colIndex}
        filterIcon={props.filterIcon}
        tFilterValue={tFilterValue.value}
        innerFilterValue={innerFilterValue.value}
        tableFilterClasses={tableFilterClasses}
        isFocusClass={isFocusClass}
        popupProps={col.filter.popupProps}
        primaryTableElement={primaryTableRef.value?.$el}
        on={{
          reset: onReset,
          confirm: onConfirm,
          'inner-filter-change': onInnerFilterChange,
          'visible-change': onPopupVisibleChange,
        }}
        attach={props.attach}
      ></TableFilterController>
    );
  }

  function setFilterPrimaryTableRef(primaryTableElement: any) {
    primaryTableRef.value = primaryTableElement;
  }

  function onPopupVisibleChange(visible: boolean) {
    if (visible && !isTableOverflowHidden.value) {
      isTableOverflowHidden.value = !visible;
    }
  }

  return {
    hasEmptyCondition,
    isTableOverflowHidden,
    renderFilterIcon,
    renderFirstFilterRow,
    setFilterPrimaryTableRef,
  };
}
