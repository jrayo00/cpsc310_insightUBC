import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {Dataset} from "./Dataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

    public datasets: Dataset[] = new Array();
    public datasetsString: string[] = new Array();

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        if (!this.verifyParameters(id, content, kind)) {
            return Promise.reject(new InsightError("addDataset parameters cannot be null or undefined"));
        }
        if (this.idContainsUnderscore(id)) {
            return Promise.reject(new InsightError("id cannot contain underscore(s)"));
        }
        if (this.datasetsString.includes(id)) {
            return Promise.reject(new InsightError("dataset with id: " + id + "already exists"));
        }
        // Test if given id is all whitespaces
        if (this.allWhitespaces(id)) {
            return Promise.reject(new InsightError("id cannot be all whitespaces"));
        }
        if (kind === InsightDatasetKind.Rooms) {
            return Promise.reject("Not implemented");
        }
        // read a zip file
        let datasetsReference: Dataset[] = this.datasets;
        let datasetsStringReference: string[] = this.datasetsString;
        return JSZip.loadAsync(content, { base64: true }).then(function (zip: JSZip) {
            let newDataset: Dataset = new Dataset(id, kind);
            const promises: Array<Promise<any>> = [];
            zip.folder("courses").forEach(function (relativePath, currentFile) {
                promises.push (currentFile.async("text").then(function (data: string) {
                    if (kind === InsightDatasetKind.Courses) {
                        newDataset.parseDataCourses(data);
                    }
                }).catch((err: any) => {
                    Log.error("error thrown, file not valid JSON!");
                   // Promise.reject("Not valid json");
                }));
            });
            return Promise.all(promises).then(function () {
                if (newDataset.numRows > 0) {
                    datasetsStringReference.push(id);
                    datasetsReference.push(newDataset);
                } else {
                    return Promise.reject(new InsightError("No valid sections were found in given zip"));
                }
                // Write to file only after all promises have been resolved
                if (newDataset.writeToFile()) {
                     return Promise.resolve(datasetsStringReference);
                 } else {
                     return Promise.reject(new InsightError("Could not write dataset to file"));
                 }
            }).catch((err: any) => {
                return Promise.reject(new InsightError("Promise.all returned one or more Promise.reject"));
            });
        }).catch((err: any) => {
                return Promise.reject(new InsightError("invalid zip file"));
        });
        return Promise.reject(new InsightError());
    }

    private idContainsUnderscore(id: string) {
        return id.includes("_");
    }

    private verifyParameters(id: string, content: string, kind: InsightDatasetKind): boolean {
        if (id === null || id === undefined) {
            return false;
        }
        if (content === null || content === undefined) {
            return false;
        }
        if (kind === null || kind === undefined) {
            return false;
        }

        return true;
    }

    public removeDataset(id: string): Promise<string> {
        if (id == null) {
            return Promise.reject(new InsightError("id cannot be null or undefined"));
        }
        if (this.idContainsUnderscore(id)) {
            return Promise.reject(new InsightError("id cannot contain underscore(s)"));
        }
        // Test if given id is all whitespaces
        if (this.allWhitespaces(id)) {
            return Promise.reject(new InsightError("id cannot be all whitespaces"));
        }
        if (!this.datasetsString.includes(id)) {
            return Promise.reject(new NotFoundError("dataset with id: " + id + "has not yet been added"));
        }
        let counter: number = 0;
        for (let dataset of this.datasets) {
            if (dataset.id === id) {
                this.datasets.slice(counter, 1);
                let index: number = this.datasetsString.indexOf(id);
                this.datasetsString.splice(index, 1);
                return Promise.resolve(id);
            }
            counter++;
        }
        return Promise.reject();
    }

    public performQuery(query: any): Promise <any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.datasets);
    }
    private allWhitespaces(id: string): boolean {
        for (let i: number = 0; i < id.length; i++) {
            if (id.charAt(i) !== " ") {
                return false;
            }
        }
        return true;
    }

}
