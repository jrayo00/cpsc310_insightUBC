import Log from "../Util";

export class Section {
    public info = {
        Subject : "",
        Course : "",
        Avg : -1,
        Professor : "",
        Title : "",
        Pass : -1,
        Fail : -1,
        Audit : -1,
        id : -1,
        Year : -1
    };

    constructor() {
        Log.trace("Section::init()");

    }
}
