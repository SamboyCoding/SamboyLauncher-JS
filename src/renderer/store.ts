import Vuex from "vuex";

export default new Vuex.Store({
    strict: true,
    state: {
        selectedPack: 0,
        packJsons: [],
        vanillaMCVersions: {},
        darkMode: false,
        selectedTab: 'play-modded',
        backgroundUrls: {},
        installs: [],
    },
    mutations: {
        setSelectedPack: (state, payload) => {
            state.selectedPack = payload;
        },
        setPackNames: (state, payload) => {
            state.packJsons = payload;
        },
        toggleDark: state => {
            state.darkMode = !state.darkMode;
        },
        setSelectedTab: (state, payload) => {
            state.selectedTab = payload;
        },
        loadBackgrounds: (state, payload) => {
            state.backgroundUrls = payload;
        },
        setMCVersions: (state, payload) => {
            state.vanillaMCVersions = payload;
        },
        setInstalls: ((state, payload) => {
            state.installs = payload;
        })
    },
    actions: {},
});
