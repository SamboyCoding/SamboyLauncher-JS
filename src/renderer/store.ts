import Vuex from "vuex";

export default new Vuex.Store({
    strict: true,
    state: {
        selectedPack: 0,
        packJsons: [],
        darkMode: false
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
        }
    },
    actions: {},
});
