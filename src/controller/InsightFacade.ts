import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
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
        let allWhiteSpace: boolean = true;
        for (let i: number = 0; i <= id.length; i++) {
            if (id.charAt(i) !== " ") {
                allWhiteSpace = false;
                break;
            }
        }
        if (allWhiteSpace) {
            return Promise.reject(new InsightError("id cannot be all whitespaces"));
        }

        return Promise.reject("Not implemented.");
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
}
