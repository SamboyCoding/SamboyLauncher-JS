import Vuex from "vuex";

export default new Vuex.Store({
    strict: true,
    state: {
        selectedPack: 0,
        packNames: [],
        darkMode: false
    },
    mutations: {
        setSelectedPack: function(state, payload) {
            console.log(JSON.stringify(state));
            state.selectedPack = payload;
            console.log(JSON.stringify(state));
        },
        setPackNames: function(state, payload) {
            state.packNames = payload;
        },
        toggleDark: function(state) {
            state.darkMode = !state.darkMode;
        }
    },
    actions: {},
});
