import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import InsightQuery from "./InsightQuery";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    public datasets: string[] ;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.datasets = [];
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return Promise.reject("Not implemented.");
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise <any[]> {
        // Construct helper class
        let insightQuery: InsightQuery;
        insightQuery = new InsightQuery();
        // Validate the input query
        return insightQuery.validQuery(query, this.datasets).then((result: boolean) => {
            Log.info(`In performQuery ${result}`);
            if (result) {
                // Return fetched query result if the input query is valid
                return insightQuery.fetchQuery(query);
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

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
}
