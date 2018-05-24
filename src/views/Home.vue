<template>
  <Page class="home">
    <div class="test">
      <img v-for="i in 10" :key="i" src="../assets/logo.png">
    </div>
  </Page>
</template>

<script>
// @ is an alias to /src
import Page from "../components/Page.vue";

export default {
  name: "home",
  components: {
    Page
  }
};
</script>
<style scoped>
.test {
  display: flex;
  overflow: scroll;
}
img {
  width: 100px;
}
</style>
