export default class MavenArtifact {
    public domain: String;
    public name: string;
    public version: string;
    public classifier?: string = null;
    public ext: string = "jar";

    get filename() {
        return `${this.name}-${this.version}${this.classifier ? `-${this.classifier}` : ""}.${this.ext}`;
    }

    get directory() {
        return `${this.domain.replace(/\./g, "/")}/${this.name}/${this.version}`;
    }

    get fullPath() {
        return this.directory + "/" + this.filename;
    }

    public static FromString(descriptor: string): MavenArtifact {
        const ret = new MavenArtifact();
        const split = descriptor.split(":");

        ret.domain = split[0];
        ret.name = split[1];

        const last = split.length - 1;
        const idx = split[last].indexOf("@");
        if (idx !== -1) {
            ret.ext = split[last].substr(idx + 1);
            split[last] = split[last].substr(0, idx);
        }

        ret.version = split[2];
        if (split.length > 3)
            ret.classifier = split[3];

        return ret;
    }
}
