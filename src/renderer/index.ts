import Vue from "vue";
import Vuex from "vuex";
import App from "./App.vue";
import MainProcessActions from "./MainProcessActions";

Vue.use(Vuex);

import store from "./store";

MainProcessActions.logMessage("[Early] Early init complete, loading config options...");

async function loadBGs() {
    store.commit("loadBackgrounds", {
        "light_modded": await MainProcessActions.pathToDataUrl("src/renderer/resources/backgrounds/bg_light_mode_play.jpg"),
        "dark_modded": await MainProcessActions.pathToDataUrl("src/renderer/resources/backgrounds/bg_dark_mode_play.png"),
        "light_vanilla": await MainProcessActions.pathToDataUrl("src/renderer/resources/backgrounds/bg_light_mode_vanilla.jpg"),
        "dark_vanilla": await MainProcessActions.pathToDataUrl("src/renderer/resources/backgrounds/bg_dark_mode_vanilla.jpg")
    });
}

loadBGs();

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
