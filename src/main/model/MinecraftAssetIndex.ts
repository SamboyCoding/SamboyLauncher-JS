import MinecraftAssetDefinition from "./MinecraftAssetDefinition";

export default class MinecraftAssetIndex {
    public objects: {
        [filename: string]: MinecraftAssetDefinition;
    };
}
