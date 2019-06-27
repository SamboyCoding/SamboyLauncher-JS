import Vue from "vue";
import Vuex from "vuex";
import Page from "./model/Page";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        currentPage: Page.MAIN_MENU,
        editingPack: null,
        installingPacks: [],
    },
    mutations: {
        setCurrentPage: (state, payload: Page) => {
            state.currentPage = payload;
        },
        setEditingPack: (state, payload) => {
            state.editingPack = payload;
        },
        queuePackInstall: (state, payload) => {
            state.installingPacks.push(payload);
        }
    },
    actions: {},
});
