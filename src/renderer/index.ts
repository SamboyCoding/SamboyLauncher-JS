import Vue from "vue";
import Vuex from "vuex";
import App from "./App.vue";
import MainProcessActions from "./MainProcessActions";

Vue.use(Vuex);

import store from "./store";

MainProcessActions.logMessage("[Early] Early init complete, loading config options...");

if(localStorage.getItem("darkMode") === "1")
    store.commit("toggleDark");

MainProcessActions.logMessage("[Early] Mounting Vue component...");

new Vue({
    store,
    el: "#app",
    render: h => h(App),
    components: {
        App
    }
});
