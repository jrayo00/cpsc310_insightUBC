import Log from "../Util";
import {Section} from "./Section";

export class Dataset {
    private sections: Section[] = [];

    constructor() {
        Log.trace("Dataset::init()");
    }
}
