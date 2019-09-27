import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {Dataset} from "./Dataset";
import * as fs from "fs";
import {JSZipObject} from "jszip";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

    protected datasets: Dataset[] = new Array();
    protected datasetsString: string[] = new Array();

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // TODO: refactor cases below
        if (id === null || id === undefined) {
            return Promise.reject(new InsightError("id cannot be null or undefined"));
        }
        if (content === null || content === undefined) {
            return Promise.reject(new InsightError("content cannot be null or undefined"));
        }
        if (kind === null || kind === undefined) {
            return Promise.reject(new InsightError("kind cannot be null or undefined"));
        }
        if (id.includes("_")) {
            return Promise.reject(new InsightError("id cannot contain underscore(s)"));
        }
        // Test if given id is all whitespaces
        if (this.allWhitespaces(id)) {
            return Promise.reject(new InsightError("id cannot be all whitespaces"));
        }
        // read a zip file
        JSZip.loadAsync(content, { base64: true }).then(function (zip: JSZip) {
            let newDataset: Dataset = new Dataset(id);
            zip.folder(id).forEach(function (relativePath, currentFile) {
                currentFile.async("text").then(function (data: string) {
                    newDataset.parseData(data);
                }).catch((err: any) => {
                    Log.error("error thrown !");
                });
            });
            this.datasets.push(newDataset);
            this.datasetsString.push(id);
            Log.test(this.datasetsString);
            return Promise.resolve(this.datasetsString);
        }).catch((err: any) => {
                Log.error("error thrown !");
                return Promise.reject(new InsightError("invalid zip file"));
        });
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise <any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
    private allWhitespaces(id: string): boolean {
        for (let i: number = 0; i <= id.length; i++) {
            if (id.charAt(i) !== " ") {
                return false;
            }
        }
        return true;
    }
}
