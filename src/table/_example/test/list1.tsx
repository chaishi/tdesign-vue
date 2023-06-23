import { defineComponent } from "@vue/composition-api";
import Item from './item1';

export default defineComponent({
  name: 'List1',
  
  components: { Item },

  props: {
    others: Object,
    list: Array,
    value: Array,
  },

  methods: {
    renderEmpty() {
      return <div>empty</div>
    },
  },

  render() {
    return (
      <div>
        {/* <item v-for="item in list" :key="item.a" :info="item"></item> */}
        {!this.list.length ? this.renderEmpty() : this.list?.map((item) => (
          <Item key={item.a} info={item} />
        ))}
        {JSON.stringify(this.others)}
      </div>
    );
  },
});