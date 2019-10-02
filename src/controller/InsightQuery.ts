import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import {IInsightQuery} from "./IInsightQuery";
import {IInsightQueryHelper} from "./IInsightQueryHelper";
import {type} from "os";
import InsightQueryHelper from "./InsightQueryHelper";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightQuery implements IInsightQuery {
    public datasets: { [id: string]: any[] } ;
    public datasetCalled: string;

    constructor() {
        Log.trace("InsightQueryImpl::init()");
        this.datasets = {};
        this.datasetCalled = "";
    }

    public insightQueryHelper: InsightQueryHelper = new InsightQueryHelper();

    public validQuery(query: any, datasetIds: string[]): Promise <boolean> {
        return new Promise((resolve, reject) => {
            let isValid = true;
            // Check if the input is a JSON object
            if (typeof query === "object") {
                const allTheKeys = Object.keys(query);
                // Check if query is empty
                if (allTheKeys.length !== 2) {
                    return reject(new InsightError("Missing keys or excessive keys in query."));
                } else {
                    // Check if there is exactly one WHERE and one OPTIONS
                    if (!("WHERE" in query) || !("OPTIONS" in query)) {
                        return reject(new InsightError("Invalid key in query."));
                    }
                }
                // Valid if the input is null, otherwise call helper
                if (!this.insightQueryHelper.isObjectEmpty(query["WHERE"])) {
                    isValid = this.validFilter(query["WHERE"]) && this.validOptions(query["OPTIONS"]);
                } else {
                    isValid = this.validOptions(query["OPTIONS"]);
                }
                // Semantic checking only if the query is syntactically valid
                if (isValid) {
                    isValid = this.semanticCheck(query, datasetIds);
                    if (!isValid) {return reject(new NotFoundError()); }
                } else {
                    return reject(new InsightError("Query doesn't pass syntactic checking."));
                }
            } else {
                return reject(new InsightError("Query is not a JSON object."));
            }
            return resolve(isValid);
        });
    }

    public validFilter(filter: any): boolean {
        let isValid = true;
        // Check if the input is a JSON object
        if (typeof filter === "object") {
            const allTheKeys = Object.keys(filter);
            // Check if query is empty
            if (allTheKeys.length === 1) {
                switch (allTheKeys[0]) {
                    case "AND":
                        isValid = this.insightQueryHelper.validLogicComparison(filter["AND"]);
                        break;
                    case "OR":
                        isValid = this.insightQueryHelper.validLogicComparison(filter["OR"]);
                        break;
                    case "NOT":
                        isValid = this.validFilter(filter["NOT"]);
                        break;
                    case "LT":
                        isValid = this.insightQueryHelper.validMComparison(filter["LT"]);
                        break;
                    case "GT":
                        isValid = this.insightQueryHelper.validMComparison(filter["GT"]);
                        break;
                    case "EQ":
                        isValid = this.insightQueryHelper.validMComparison(filter["EQ"]);
                        break;
                    case "IS":
                        isValid = this.insightQueryHelper.validSComparison(filter["IS"]);
                        break;
                    default:
                        isValid = false;
                }
            } else {
                isValid = false;
            }
        } else {
            isValid = false;
        }
        return isValid;
    }

    public validOptions(options: any): boolean {
        let isValid = true;
        // Check if the input is a JSON object
        if (typeof options === "object") {
            const allTheKeys = Object.keys(options);
            switch (allTheKeys.length) {
                case 0:
                    isValid = false;
                    break;
                case 1:
                    if (!("COLUMNS" in options)) {
                        isValid = false;
                    } else {
                        isValid = this.validColumns(options["COLUMNS"]);
                    }
                    break;
                case 2:
                    if (!("COLUMNS" in options) || !("ORDER" in options)) {
                        isValid = false;
                    } else {
                        isValid = this.validColumns(options["COLUMNS"]) && this.validOrder(options["ORDER"]);
                        // If both COLUMNS and OPTIONS are valid, check if COLUMNS contains ORDER
                        if (isValid) {
                            isValid = options["COLUMNS"].includes(options["ORDER"]);
                        }
                    }
                    break;
                default:
                    isValid = false;
            }
        } else {
            isValid = false;
        }
        return isValid;
    }

    public validColumns(cols: any): boolean {
        let isValid = true;
        if (Array.isArray(cols)) {
            // COLUMNS array cannot be empty
            if (cols.length > 0) {
                isValid = this.insightQueryHelper.validKeys(cols);
            } else {
                isValid = false;
            }
        } else {
            isValid = false;
        }
        return isValid;
    }

    public validOrder(order: any): boolean {
        let isValid = true;
        if (typeof order === "string") {
            isValid = this.insightQueryHelper.validKeys(order);
        } else {
            isValid = false;
        }
        return isValid;
    }

    public semanticCheck(query: any, datasetIds: string[]): boolean {
        // Know the query is valid syntactically, return false if multiple datasets selected
        let datasets: string[] = [];
        datasets = this.insightQueryHelper.getDatasetIDInWHERE(query["WHERE"], datasets);
        datasets = this.insightQueryHelper.getDatasetIDInOPTIONS(query["OPTIONS"], datasets);
        // Todo: Need to check if the dataset has been added, call listDatasets()
        let isValid = this.insightQueryHelper.isAdded(datasets[0], datasetIds);
        if (isValid) {
            isValid = !this.insightQueryHelper.areMultipleDatasets(datasets);
            this.datasetCalled = datasets[0];
        } else {return isValid; }
        return isValid;
    }

    public fetchQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            const body = query["WHERE"];
            const options = query["OPTIONS"];
            let result: any[] = [];
            if (!Object.keys(this.datasets).includes(this.datasetCalled)) {
                this.datasets[this.datasetCalled] = this.insightQueryHelper.getDataset(this.datasetCalled);
            }
            let dataset: any = this.datasets[this.datasetCalled];
            dataset = Object.values(dataset[0])[0];
            if (this.insightQueryHelper.isObjectEmpty(body)) {
                result = Array.from(dataset.keys());
            } else {
                result = this.getIndexes(dataset, body);
            }
            result = this.insightQueryHelper.indexWithNumber(dataset, result);
            result = this.insightQueryHelper.extractProperties(result, options["COLUMNS"], this.datasetCalled);
            if (("ORDER" in options)) {
                result = this.insightQueryHelper.orderByProperty(result, options["ORDER"]);
            }
            return resolve(result);
        });
    }

    public getIndexes(dataset: any[], query: any): number[] {
        let indexes: number[] = [];
        let value: any;
        let field = "";
        let item: any;
        const allTheKeys = Object.keys(query);
        switch (allTheKeys[0]) {
            case "AND":
                item = query["AND"];
                indexes = Array.from(dataset.keys());
                for (let filter in item) {
                    indexes = this.insightQueryHelper.intersectIndexes(indexes, this.getIndexes(dataset, item[filter]));
                }
                break;
            case "OR":
                item = query["OR"];
                for (let filter in item) {
                    indexes = this.insightQueryHelper.unionIndexes(indexes, this.getIndexes(dataset, item[filter]));
                }
                break;
            case "NOT":
                indexes = this.getIndexes(dataset, query["NOT"]);
                indexes = this.insightQueryHelper.filterWithNumber(Array.from(dataset.keys()), indexes);
                break;
            case "LT":
                item = query["LT"];
                indexes = this.insightQueryHelper.getIndexesLT(dataset, item);
                break;
            case "GT":
                item = query["GT"];
                indexes = this.insightQueryHelper.getIndexesGT(dataset, item);
                break;
            case "EQ":
                item = query["EQ"];
                indexes = this.insightQueryHelper.getIndexesEQ(dataset, item);
                break;
            case "IS":
                item = query["IS"];
                indexes = this.insightQueryHelper.getIndexesIS(dataset, item);
                break;
            default:
                indexes = [];
        }
        return indexes;
    }
}
