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
        for (let i = 0; i < obj.result.length; i++) {
            // iterate through result array and get the key value pairs
            let newSection: Section = new Section();
            newSection.info.Subject = obj.result[i].Subject;
            newSection.info.Course = obj.result[i].Course;
            newSection.info.Avg = obj.result[i].Avg;
            newSection.info.Professor = obj.result[i].Professor;
            newSection.info.Title = obj.result[i].Title;
            newSection.info.Pass = obj.result[i].Pass;
            newSection.info.Fail = obj.result[i].Fail;
            newSection.info.Audit = obj.result[i].Audit;
            newSection.info.id = obj.result[i].id;
            newSection.info.Year = obj.result[i].Year;
            this.allSections.push(newSection);
        }
        Log.test("STOP");
    }
}
