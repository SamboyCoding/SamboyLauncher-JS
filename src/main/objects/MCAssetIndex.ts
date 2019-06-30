import MCAssetDefinition from "./MCAssetDefinition";

export default class MCAssetIndex {
    public objects: {
        [filename: string]: MCAssetDefinition;
    };
}
