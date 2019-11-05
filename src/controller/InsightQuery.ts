import Log from "../Util";
import {InsightError} from "./IInsightFacade";
import {IInsightQuery} from "./IInsightQuery";
import InsightValidateHelper from "./InsightValidateHelper";
import InsightFetchHelper from "./InsightFetchHelper";
import InsightTransformHelper from "./InsightTransformHelper";
import * as fs from "fs-extra";

/**
 * This is the query handling class for the insightFacade class.
 * Method documentation is in IInsightQuery
 */
export default class InsightQuery implements IInsightQuery {
    public datasets: { [id: string]: any[] } ;
    public datasetCalled: string;
    public insightValidateHelper: InsightValidateHelper;
    public insightFetchHelper: InsightFetchHelper;
    public insightTransformHelper: InsightTransformHelper;

    constructor() {
        Log.trace("InsightQueryImpl::init()");
        this.datasets = {};
        this.datasetCalled = "";
        this.insightFetchHelper = new InsightFetchHelper();
        this.insightValidateHelper = new InsightValidateHelper();
        this.insightTransformHelper = new InsightTransformHelper();
    }

    public validQuery(query: any, datasets: any[], datasetIds: string[]): Promise <boolean> {
        return new Promise((resolve, reject) => {
            if (typeof query === "object" && query !== null) {
                // Semantic checking only if the query is syntactically valid
                if (this.syntacticCheck(query)) {
                    if (this.checkCalledDataset(query) && this.checkSelectedColumns(query)) {
                        // Only check if the dataset is added when the query is valid at this point
                        if (this.isAdded(this.datasetCalled, datasetIds) &&
                            this.checkKeyConsistency(datasets, datasetIds, this.datasetCalled)) {
                            return resolve(true);
                        }
                        return reject (new InsightError("Dataset not added"));
                    }
                    return reject (new InsightError("Failed semantic checking"));
                }
                return reject (new InsightError("Failed syntactic checking"));
            }
            return reject(new InsightError("Invalid query"));
        });
    }

    public syntacticCheck(query: any): boolean {
        let isValid = false;
        const allTheKeys = Object.keys(query);
        // If there're 2 or 3 keys
        if (allTheKeys.length > 1 && allTheKeys.length < 4 && "WHERE" in query && "OPTIONS" in query) {
            if (!this.insightValidateHelper.isObjectEmpty(query["WHERE"])) {
                isValid = this.insightValidateHelper.validFilter(query["WHERE"]) && this.validOptions(query["OPTIONS"]);
            } else {
                isValid = this.validOptions(query["OPTIONS"]);
            }
            if (allTheKeys.length === 3 && isValid) {
                return this.validTrans(query["TRANSFORMATIONS"]);
            }
        }
        return isValid;
    }

    public validTrans(trans: any): boolean {
        if (typeof trans === "object" && trans !== null) {
            const allTheKeys = Object.keys(trans);
            if (allTheKeys.length === 2 && "GROUP" in trans && "APPLY" in trans) {
                return this.insightValidateHelper.validKeys(trans["GROUP"], false) &&
                    this.insightValidateHelper.validApply(trans["APPLY"]);
            }
        }
        return false;
    }

    public validOptions(options: any): boolean {
        // Check if the input is a JSON object
        if (typeof options === "object") {
            const allTheKeys = Object.keys(options);
            switch (allTheKeys.length) {
                case 1:
                    return this.insightValidateHelper.validKeys(options["COLUMNS"], true);
                case 2:
                    // If ORDER clause is an object
                    if (typeof options["ORDER"] === "object") {
                        // If both COLUMNS and OPTIONS are valid, check if COLUMNS contains ORDER
                        if (this.insightValidateHelper.validKeys(options["COLUMNS"], true) &&
                            this.insightValidateHelper.validOrder(options["ORDER"])) {
                            const order = options["ORDER"];
                            return this.insightValidateHelper.isSubarray(options["COLUMNS"], order["keys"]);
                        }
                    } else if (typeof options["ORDER"] === "string") {
                        // If ORDER clause is a string (key)
                        if (this.insightValidateHelper.validKeys(options["COLUMNS"], true) &&
                            this.insightValidateHelper.validKeys(options["ORDER"], true)) {
                            return options["COLUMNS"].includes(options["ORDER"]);
                        }
                    }
                    return false;
            }
        }
        return false;
    }

    public checkCalledDataset(query: any): boolean {
        // Know the query is valid syntactically, return false if multiple datasets selected
        let datasets: string[] = [];
        datasets = this.insightValidateHelper.getDatasetIDInWHERE(query["WHERE"], datasets);
        datasets = this.insightValidateHelper.getDatasetIDInOPTIONS(query["OPTIONS"], datasets);
        if ("TRANSFORMATIONS" in query) {
            datasets = this.insightValidateHelper.getDatasetIDInTRANSFORMATIONS(query["TRANSFORMATIONS"], datasets);
        }
        let isValid = !this.insightValidateHelper.areMultipleItems(datasets);
        this.datasetCalled = datasets[0];
        return isValid;
    }

    public checkSelectedColumns(query: any): boolean {
        // Return true if TRANSFORMATIONS clause is empty
        if ("TRANSFORMATIONS" in query) {
            const options = query["OPTIONS"];
            const cols = options["COLUMNS"];
            const trans = query["TRANSFORMATIONS"];
            const group = trans["GROUP"];
            const apply = trans["APPLY"];
            let applyKeys: string[] = [];
            for (let item in apply) {
                applyKeys = applyKeys.concat(Object.keys(apply[item])[0]);
            }
            const transKeys = group.concat(applyKeys);
            // return this.insightValidateHelper.isSubarray(cols, group) &&
            //     this.insightValidateHelper.isSubarray(transKeys, cols) &&
            //     !this.insightValidateHelper.hasDuplicates(applyKeys);
            return this.insightValidateHelper.isSubarray(transKeys, cols) &&
                !this.insightValidateHelper.hasDuplicates(applyKeys);
        }
        return true;
    }

    public isAdded(datasetId: string, datasetIds: string[]): boolean {
        const cacheDir = __dirname + "/../../data/";
        let isAdded = false;
        for (let d in datasetIds) {
            if (datasetIds[d] === datasetId) {
                isAdded = true;
            }
        }
        if (!isAdded) {
            try {
                const dataset = fs.readFileSync(cacheDir + datasetId + ".txt", "text");
                isAdded = true;
            } catch (e) {
                isAdded = false;
            }
        }
        return isAdded;
    }

    public fetchQuery(query: any, datasets: any[], datasetsString: any[]): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            const body = query["WHERE"];
            const options = query["OPTIONS"];
            let result: any[] = [];
            let dataset: any[];
            if (!datasetsString.includes(this.datasetCalled)) {
                datasets.push(this.insightFetchHelper.getDataset(this.datasetCalled));
                datasetsString.push(this.datasetCalled);
            }
            let index: number = datasetsString.indexOf(this.datasetCalled);
            dataset = datasets[index].allSections;
            if (this.insightValidateHelper.isObjectEmpty(body)) {
                result = Array.from(dataset.keys());
            } else {
                result = this.insightFetchHelper.getIndexes(dataset, body);
            }
            result = this.insightFetchHelper.indexWithNumber(dataset, result);
            // TODO: If "TRANSFORMATIONS" in query
            // Group with an intermediate data structure, calculate, and store applyKeys in properties
            if ("TRANSFORMATIONS" in query) {
                result = this.insightTransformHelper.transformQuery(result, query["TRANSFORMATIONS"]);
            }
            result = this.insightFetchHelper.extractProperties(result, options["COLUMNS"], this.datasetCalled);
            if (("ORDER" in options)) {
                result = this.orderByProperty(result, options["ORDER"]);
            }
            return resolve(result);
        });
    }

    public orderByProperty(result: any[], order: any): any[] {
        if (typeof order === "string") {
            result.sort((a, b) => {
                return this.insightValidateHelper.compareTo(a, b, order);
            });
        } else {
            // Sort by a list of properties
            const dir = order["dir"];
            const properties = order["keys"];
            result.sort((a, b) => {
                let flag = 0;
                for (let p in properties) {
                    flag = flag || this.insightValidateHelper.compareTo(a, b, properties[p]);
                }
                return flag;
            });
            // Reverse the order
            if (dir === "DOWN") {
                result.reverse();
            }
        }
        return result;
    }

    public checkKeyConsistency(datasets: any[], datasetsString: any[], datasetCalled: string): boolean {
        let index: number = datasetsString.indexOf(datasetCalled);
        let section = datasets[index].allSections[0];
        section = section.info;
        let keys = Object.keys(section);
        let mkeys: string[] = [];
        let skeys: string[] = [];
        for (let i in keys) {
            let key = keys[i];
            if (typeof section[key] === "string") {
                skeys = skeys.concat(key);
            } else {
                mkeys = mkeys.concat(key);
            }
        }
        return this.isEqual(skeys, this.insightValidateHelper.sfields) &&
            this.isEqual(mkeys, this.insightValidateHelper.mfields);
    }

    public isEqual(a: string[], b: string[]): boolean {
        if (b.length === 0) {
            return true;
        }
        for (let i in b) {
            if (!a.includes(b[i])) {
                return false;
            }
        }
        return true;
    }
}
