<template>
  <div>
    <!-- {{  info.a  }}
    {{  info.b  }}
    {{  info.c  }} -->
    {{ getData()  }}
  </div>
</template>

<script>
export default {
  name: 'Init',
  props: {
    info: Object,
  },

  methods: {
    getData() {
      const { info } = this;
      console.log('item computed');
      return [info.a, info.b, info.c].join('_');
    },
  },

  updated() {
    console.log('----updated---');
  },
};
</script>

<style lang='less'>
</style>
