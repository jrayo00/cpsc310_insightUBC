import Log from "../Util";
import {Section} from "./Section";

export class Dataset {
    public allSections: Section[] = [];
    public name: string;
    constructor(id: string) {
        Log.trace("Dataset::init()");
        this.name = id;
    }

    public parseData(data: string) {
        let obj = JSON.parse(data);
        Log.test(obj.result.length);
        for (let item of obj.result) {
            // iterate through result array and get the key value pairs
            let newSection: Section = new Section();
            newSection.info.Subject = item.Subject;
            newSection.info.Course = item.Course;
            newSection.info.Avg = item.Avg;
            newSection.info.Professor = item.Professor;
            newSection.info.Title = item.Title;
            newSection.info.Pass = item.Pass;
            newSection.info.Fail = item.Fail;
            newSection.info.Audit = item.Audit;
            newSection.info.id = item.id;
            newSection.info.Year = item.Year;
            this.allSections.push(newSection);
        }
        Log.test("STOP");
    }
}
