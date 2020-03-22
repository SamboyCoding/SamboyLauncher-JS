import Vuex from "vuex";

export default new Vuex.Store({
    strict: true,
    state: {
        selectedPack: 0,
        darkMode: false
    },
    mutations: {
        setSelectedPack(state, payload) {
            console.log(JSON.stringify(state));
            state.selectedPack = payload;
            console.log(JSON.stringify(state));
        },
        toggleDark(state) {
            state.darkMode = !state.darkMode
        }
    },
    actions: {},
});
