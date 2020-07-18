import Vuex from "vuex";
import MainProcessActions from "./MainProcessActions";
import Utils from "./Utils";

export default new Vuex.Store({
    strict: true,
    state: {
        selectedPack: 0,
        packJsons: [],
        darkMode: false,
        selectedTab: 'play-modded',
        backgroundUrls: {},
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
        loadBackgrounds: async (state, payload) => {
            console.log("Loading background URLs")
            state.backgroundUrls = payload;
        }
    },
    actions: {},
});
