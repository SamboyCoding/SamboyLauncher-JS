import Vue from "vue";
import Vuex from "vuex";
import InstalledPackJSON from "../main/model/InstalledPackJSON";
import Page from "./model/Page";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        currentPage: Page.MAIN_MENU,
        installedPacks: [],
        createdPacks: [],
        editingPack: null,
        fmlVersion: "",
        mcVersion: "",
        installingPacks: {},
        showEditPack: false,
        editMods: false,
        username: "",
    },
    mutations: {
        setCurrentPage: (state, payload: Page) => {
            state.currentPage = payload;
        },
        setEditingPack: (state, payload: InstalledPackJSON) => {
            state.editingPack = payload;
            if (payload) {
                state.fmlVersion = payload.forgeVersion;
                state.mcVersion = payload.gameVersion;
            } else {
                state.fmlVersion = "";
                state.mcVersion = "";
            }
        },
        queuePackInstall: (state, payload) => {
            state.installingPacks[payload] = 0;
        },
        setMCVers: (state, payload) => {
            state.editingPack.gameVersion = payload;
            state.mcVersion = payload;
        },
        setForgeVers: (state, payload) => {
            state.editingPack.forgeVersion = payload;
            state.fmlVersion = payload;
        },
        setInstallProgress: (state, payload) => {
            state.installingPacks[payload.name] = payload.value;
        },
        cancelInstall: (state, payload) => {
            if (state.installingPacks.hasOwnProperty(payload))
                delete state.installingPacks[payload];
        },
        setInstalledPacks: (state, payload) => {
            state.installedPacks = payload;
        },
        setCreatedPacks: (state, payload) => {
            state.createdPacks = payload;
        },
        addCreatedPack: (state, payload) => {
            state.createdPacks.push(payload);
        },
        removeCreatedPack: (state, payload) => {
            let index = state.createdPacks.findIndex(p => p.packName === payload);
            if (index >= 0)
                state.createdPacks.splice(index, 1);
        },
        setShowEditPack: (state, payload) => {
            state.showEditPack = payload;
        },
        setEditMods: (state, payload) => {
            state.editMods = payload;
        },
        setUsername: (state, payload) => {
            state.username = payload;
        },
    },
    actions: {},
});
