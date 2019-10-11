import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import * as JSZip from "jszip";
import {Dataset} from "./Dataset";
import * as fs from "fs";
import InsightQuery from "./InsightQuery";

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
            return this.addRoomsDataset(id, content);
        }
        // Reference variables used b/c Promise.all can't find the member variables.
        let datasetsReference: Dataset[] = this.datasets;
        let datasetsStringReference: string[] = this.datasetsString;
        // read a zip file
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
                 }
            }).catch((err: any) => {
                return Promise.reject(new InsightError("Promise.all returned one or more Promise.reject"));
            });
        }).catch((err: any) => {
                return Promise.reject(new InsightError("invalid zip file"));
        });
    }

    private addRoomsDataset(id: string, content: string): Promise<any> {
        return JSZip.loadAsync(content, { base64: true }).then(function (zip: JSZip) {
            let newDataset: Dataset = new Dataset(id, InsightDatasetKind.Rooms);
            const promises: Array<Promise<any>> = [];
            return zip.folder("rooms").file("index.htm").async("text").then(function (data: string) {
                Log.test("Retrieved file contents, now parse !");
            });
        }).catch((err: any) => {
            return Promise.reject(new InsightError("invalid zip file"));
        });
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
        // return Promise.reject("Not implemented");
        if (id == null || id === undefined) {
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
        } else {
            let index: number = this.datasetsString.indexOf(id);
            this.datasetsString.splice(index, 1);
            this.datasets.splice(index, 1);
            fs.unlinkSync(__dirname + "/../../data/" + id + ".txt");
            Log.test("Dataset removed from disk");
            return Promise.resolve(id);
        }
    }

    public listDatasets(): Promise<InsightDataset[]> {
        // return Promise.reject("Not implemented");
        let insightDatasets: InsightDataset[] = new Array();
        for (let dset of this.datasets) {
            let tmp = {id : dset.id, kind: dset.kind, numRows: dset.numRows};
            insightDatasets.push(tmp);
        }
        return Promise.resolve(insightDatasets);
    }

    private allWhitespaces(id: string): boolean {
        for (let i: number = 0; i < id.length; i++) {
            if (id.charAt(i) !== " ") {
                return false;
            }
        }
        return true;
    }


    public performQuery(query: any): Promise <any[]> {
        // Construct helper class
        let insightQuery: InsightQuery;
        insightQuery = new InsightQuery();
        // Validate the input query
        return insightQuery.validQuery(query, this.datasetsString).then((result: boolean) => {
            Log.info(`In performQuery ${result}`);
            if (result) {
                // Return fetched query result if the input query is valid
                return insightQuery.fetchQuery(query, this.datasets, this.datasetsString);
            } else {
                return Promise.reject(new InsightError("Invalid query"));
            }
        }).then((result: any[]) => {
            // Check if the result is too large
            if (result.length > 5000) {
                return Promise.reject(new ResultTooLargeError());
            } else {
                return Promise.resolve(result);
            }
        }).catch((err: any) => {
            Log.info(`In performQuery ${err}`);
            return Promise.reject(err);
        });
    }
}
