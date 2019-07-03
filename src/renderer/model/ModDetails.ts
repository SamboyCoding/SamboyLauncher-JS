export default class ModDetails {
    public slug: string;
    public name: string;
    public description: string; //Html
    public authorList: {
        title: string,
        username: string,
    }[];
    public thumbnail: string; //url
    public versions: {
        [id: number]: {
            name: string,
            gameVersion: string,
            type: string,
        }
    };
}
