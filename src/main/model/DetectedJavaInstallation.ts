export default class DetectedJavaInstallation {
    public javaHome: string;
    public provider: string;
    public languageVersion: number;
    public arch: 'x86' | 'x64';
}
