<template>
  <div>
    <item v-for="item in list" :key="item.a" :info="item"></item>
    {{ others  }}
  </div>
</template>

<script>
import Item from './item.vue';
export default {
  name: 'List',
  components: { Item },
  props: {
    others: Object,
    list: Array,
  },
  // data() {
  //   return {
  //     list: ,
  //   };
  // },

  updated() {
    console.log('~~~~updated~~~');
  },
};
</script>

<style lang='less'>
</style>
