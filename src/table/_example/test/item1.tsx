import { defineComponent } from "@vue/composition-api";

export default defineComponent({
  name: 'Item1',

  props: {
    info: Object,
  },

  methods: {
    getData() {
      const { info } = this;
      console.log('item computed');
      return [info.a, info.b, info.c].join('_');
    }
  },

  render() {
    return <div>
      {this.getData()}
      <t-checkbox></t-checkbox>
    </div>;
  },
})