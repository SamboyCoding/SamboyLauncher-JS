import Vuex from "vuex";

export default new Vuex.Store({
    strict: true,
    state: {
        selectedPack: 0,
        packJsons: [],
        darkMode: false,
        selectedTab: 'play-modded',
    },
    mutations: {
        setSelectedPack: function(state, payload) {
            state.selectedPack = payload;
        },
        setPackNames: function(state, payload) {
            state.packJsons = payload;
        },
        toggleDark: function(state) {
            state.darkMode = !state.darkMode;
        },
        setSelectedTab: function(state, payload) {
            state.selectedTab = payload;
        }
    },
    actions: {},
});
