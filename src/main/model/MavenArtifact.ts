import {basename, dirname} from "path";

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

    public static FromFile(baseLibsFolder: string, fullPath: string) {
        const ret = new MavenArtifact();

        let relativePath = fullPath.replace(baseLibsFolder, "").replace(/\\/g, "/");
        if (relativePath.startsWith("/"))
            relativePath = relativePath.substr(1);

        // some/domain/name/artifactname/version/artifactname-version-classifier.ext

        let filename = basename(relativePath);
        ret.ext = filename.substr(filename.lastIndexOf(".") + 1);

        //As the last directory will be the version, we can use that
        ret.version = dirname(relativePath);
        ret.version = ret.version.substr(ret.version.lastIndexOf("/") + 1);

        let idx = filename.indexOf(`-${ret.version}-`);
        if (idx >= 0)
        //We have a classifier
            ret.classifier = filename.substr(idx + `-${ret.version}-`.length + 1).replace(`.${ret.ext}`, "");

        //Archive name is quite easy
        idx = filename.indexOf(`-${ret.version}`);
        ret.name = filename.substr(0, idx);

        let domainPath = relativePath.replace(`/${ret.name}/${ret.version}/${filename}`, "");
        ret.domain = domainPath.replace(/\//g, ".");

        return ret;
    }
}
