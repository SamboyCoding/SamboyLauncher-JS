export default class ProcessorToRun {
    public javaArgs: string;
    //Map of FULL path to expected sha1 sum.
    public outputShaSums: Map<string, string> = new Map<string, string>();
}
