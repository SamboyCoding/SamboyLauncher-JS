import Vue from "vue";
import Vuex from "vuex";
import App from "./App.vue";

Vue.use(Vuex);

import store from "./store";

if(localStorage.getItem("darkMode") === "1")
    store.commit("toggleDark");

new Vue({
    store,
    el: "#app",
    render: h => h(App),
    components: {
        App
    }
});
