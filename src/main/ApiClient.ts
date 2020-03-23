import Logger from "./logger";
import ModJar from "./model/ModJar";
import axios from "axios";

export default class ApiClient {
    private static BASE_URL = "https://launcher.samboycoding.me/api";

    public static async getModJar(addonId: number, fileId: number): Promise<ModJar | null> {
        try {
            const response = await axios.get(`${ApiClient.BASE_URL}/mod/by-id/${addonId}/${fileId}`);

            if(response.status !== 200) return null;

            return response.data;
        } catch(e) {
            Logger.errorImpl("ApiClient", `Failed to get mod jar for addon id ${addonId} file id ${fileId}: ${e}`);
            return null;
        }
    }
}
