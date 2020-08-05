class LatestSpecification {
    public release: string;
    public snapshot: string;
}

export class VersionSpecification {
    public id: string;
    public type: 'release' | 'snapshot' | 'old_alpha' | 'old_beta';
    public url: string;
    public time: string;
    public releaseTime: string;
}

export default class MinecraftVersionListing {
    public latest: LatestSpecification;
    public versions: VersionSpecification[];
}
