import Log from "../Util";

export class Section {
    public info = {
        dept : "",
        id : "",
        avg : -1,
        instructor : "",
        title : "",
        pass : -1,
        fail : -1,
        audit : -1,
        uuid : -1,
        year : -1
    };

    constructor() {
        // Log.trace("Section::init()");
    }

    public validateKeys(): boolean {
        const allTheValues = Object.values(this.info);
        for (let item of allTheValues) {
            if (item === undefined || item === null) {
                return false;
            }
        }
        return true;
    }
}
