import ModJar from "../main/model/ModJar";

export default class ModJarSorts {
    public static byPopularity(a: ModJar, b: ModJar): number {
        return b.addonPopularityScore - a.addonPopularityScore;
    }

    public static byName(a: ModJar, b: ModJar): number {
        return a.addonName.localeCompare(b.addonName);
    }

    public static byReleaseDate(a: ModJar, b: ModJar): number {
        return a.addonId - b.addonId;
    }
}
