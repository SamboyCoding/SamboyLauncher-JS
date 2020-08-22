import Vuex from "vuex";
import DownloadQueueEntry from "../main/model/DownloadQueueEntry";
import InstalledPackJSON from "../main/model/InstalledPackJSON";
import RendererBoundVersionListing from "../main/model/RendererBoundVersionListing";

export class SBLStore {
    public selectedPack: number;
    public selectedPackBuild: number;
    public packJsons: InstalledPackJSON[];
    public vanillaMCVersions: RendererBoundVersionListing;
    public darkMode: boolean;
    public selectedTab: string;
    public backgroundUrls: {
        [key: string]: string;
    };
    public installs: DownloadQueueEntry[];
}

export default new Vuex.Store<SBLStore>({
    strict: true,
    state: {
        selectedPack: 0,
        selectedPackBuild: 0,
        packJsons: [],
        vanillaMCVersions: {},
        darkMode: false,
        selectedTab: "play-modded",
        backgroundUrls: {},
        installs: [],
    } as SBLStore,
    mutations: {
        setSelectedPack: (state, payload) => {
            state.selectedPack = payload;
        },
        setBuildModeSelectedPack: (state, payload) => {
            state.selectedPackBuild = payload;
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
        setInstalls: (state, payload) => {
            state.installs = payload;
        }
    },
    actions: {},
});
