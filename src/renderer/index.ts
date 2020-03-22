import Vue from "vue";
import Vuex from "vuex";
import App from "./App.vue";

Vue.use(Vuex);

import store from "./store";

new Vue({
    store,
    el: "#app",
    render: h => h(App),
    components: {
        App
    }
});
