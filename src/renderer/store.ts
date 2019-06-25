import Vue from "vue";
import Vuex from "vuex";
import Page from "./model/Page";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        currentPage: Page.MAIN_MENU
    },
    mutations: {
        setPage: (state, payload: Page) => {
            state.currentPage = payload;
        }
    },
    actions: {},
});
