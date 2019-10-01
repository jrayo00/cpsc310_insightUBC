import Log from "../Util";
import {Section} from "./Section";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs";

export class Dataset implements InsightDataset {
    public allSections: Section[] = [];
    public id: string;
    public numRows: number = 0;
    public kind: InsightDatasetKind;
    constructor(id: string, datasetType: InsightDatasetKind) {
        Log.trace("Dataset::init()");
        this.id = id;
        this.kind = datasetType;
    }

    public parseDataCourses(data: string) {
        try {
            let obj = JSON.parse(data);
            // Log.test(obj.result.length);
            for (let item of obj.result) {
                // iterate through result array and get the key value pairs
                let newSection: Section = new Section();
                newSection.info.dept = item.Subject;
                newSection.info.id = item.Course;
                newSection.info.avg = item.Avg;
                newSection.info.instructor = item.Professor;
                newSection.info.title = item.Title;
                newSection.info.pass = item.Pass;
                newSection.info.fail = item.Fail;
                newSection.info.audit = item.Audit;
                newSection.info.uuid = item.id;
                newSection.info.year = item.Year;
                if (item.Section === "overall") {
                    newSection.info.year = 1900;
                }
                if (newSection.validateKeys()) {
                    this.allSections.push(newSection);
                    this.numRows++;
                }
            }
        } catch (err) {
            throw new SyntaxError("invalid JSON");
        }
        // Log.test("STOP");
    }

    public writeToFile(): Promise<any> {
            try {const promises: Array<Promise<any>> = [];
                 const myNewPromise = new Promise((resolve, reject) => {
                    fs.writeFile(__dirname + "/../../data/" + this.id + ".txt", JSON.stringify(this),  (err) => {
                        if (err) {
                            throw err;
                        }
                        Log.test("The file has been saved!");
                        // Promise.resolve();
                    });
                });
                 promises.push(myNewPromise);
                 return Promise.all(promises).then(function () {
                    return Promise.resolve("Dataset written to file !");
                }).catch((err2: any) => {
                    return Promise.reject(new InsightError("Could not write dataset to file"));
                }); } catch (err) {
                Log.error("Error in creating file");
        }
    }
}
