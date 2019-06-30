import Vue from "vue";
import Vuex from "vuex";
import Page from "./model/Page";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        currentPage: Page.MAIN_MENU,
        editingPack: null,
        fmlVersion: "",
        mcVersion: "",
        installingPacks: {},
    },
    mutations: {
        setCurrentPage: (state, payload: Page) => {
            state.currentPage = payload;
        },
        setEditingPack: (state, payload) => {
            state.editingPack = payload;
            if (payload) {
                state.fmlVersion = payload.fmlVersion;
                state.mcVersion = payload.mcVersion;
            } else {
                state.fmlVersion = "";
                state.mcVersion = "";
            }
        },
        queuePackInstall: (state, payload) => {
            state.installingPacks[payload] = 0;
        },
        setMCVers: (state, payload) => {
            state.editingPack.mcVersion = payload;
            state.mcVersion = payload;
        },
        setForgeVers: (state, payload) => {
            state.editingPack.fmlVersion = payload;
            state.fmlVersion = payload;
        },
        setInstallProgress: (state, payload) => {
            state.installingPacks[payload.name] = payload.value;
        },
        cancelInstall: (state, payload) => {
            if (state.installingPacks.hasOwnProperty(payload))
                delete state.installingPacks[payload];
        }
    },
    actions: {},
});
