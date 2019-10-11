import Log from "../Util";
import {InsightError} from "./IInsightFacade";
import {IInsightQuery} from "./IInsightQuery";
import InsightValidateHelper from "./InsightValidateHelper";
import InsightFetchHelper from "./InsightFetchHelper";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightQuery implements IInsightQuery {
    public datasets: { [id: string]: any[] } ;
    public datasetCalled: string;
    public insightValidateHelper: InsightValidateHelper;
    public insightFetchHelper: InsightFetchHelper;

    constructor() {
        Log.trace("InsightQueryImpl::init()");
        this.datasets = {};
        this.datasetCalled = "";
        this.insightFetchHelper = new InsightFetchHelper();
        this.insightValidateHelper = new InsightValidateHelper();
    }

    public validQuery(query: any, datasetIds: string[]): Promise <boolean> {
        return new Promise((resolve, reject) => {
            let isValid = true;
            // Check if the input is a JSON object
            if (typeof query === "object" && query !== null) {
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
                if (!this.insightValidateHelper.isObjectEmpty(query["WHERE"])) {
                    isValid = this.validFilter(query["WHERE"]) && this.validOptions(query["OPTIONS"]);
                } else {
                    isValid = this.validOptions(query["OPTIONS"]);
                }
                // Semantic checking only if the query is syntactically valid
                if (isValid) {
                    isValid = this.semanticCheck(query, datasetIds);
                    if (isValid) {
                        isValid = this.insightFetchHelper.isAdded(this.datasetCalled, datasetIds);
                        if (!isValid) {
                            return reject(new InsightError("Query calls dataset not added."));
                        }
                    } else {
                        return reject(new InsightError("Query calls multiple datasets."));
                    }
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
                        isValid = this.insightValidateHelper.validLogicComparison(filter["AND"]);
                        break;
                    case "OR":
                        isValid = this.insightValidateHelper.validLogicComparison(filter["OR"]);
                        break;
                    case "NOT":
                        isValid = this.validFilter(filter["NOT"]);
                        break;
                    case "LT":
                        isValid = this.insightValidateHelper.validMComparison(filter["LT"]);
                        break;
                    case "GT":
                        isValid = this.insightValidateHelper.validMComparison(filter["GT"]);
                        break;
                    case "EQ":
                        isValid = this.insightValidateHelper.validMComparison(filter["EQ"]);
                        break;
                    case "IS":
                        isValid = this.insightValidateHelper.validSComparison(filter["IS"]);
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
                isValid = this.insightValidateHelper.validKeys(cols);
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
            isValid = this.insightValidateHelper.validKeys(order);
        } else {
            isValid = false;
        }
        return isValid;
    }

    public semanticCheck(query: any, datasetIds: string[]): boolean {
        // Know the query is valid syntactically, return false if multiple datasets selected
        let datasets: string[] = [];
        datasets = this.insightValidateHelper.getDatasetIDInWHERE(query["WHERE"], datasets);
        datasets = this.insightValidateHelper.getDatasetIDInOPTIONS(query["OPTIONS"], datasets);
        // Todo: Need to check if the dataset has been added, call listDatasets()
        let isValid = !this.insightValidateHelper.areMultipleDatasets(datasets);
        this.datasetCalled = datasets[0];
        return isValid;
    }

    public fetchQuery(query: any, datasets: any[], datasetsString: any[]): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            const body = query["WHERE"];
            const options = query["OPTIONS"];
            let result: any[] = [];
            let dataset: any[];
            if (!datasetsString.includes(this.datasetCalled)) {
                // Todo
                datasets.push(this.insightFetchHelper.getDataset(this.datasetCalled));
                datasetsString.push(this.datasetCalled);
            }
            // let dataset: any = datasets[this.datasetCalled];
            let index: number = datasetsString.indexOf(this.datasetCalled);
            dataset = datasets[index].allSections;
            if (this.insightValidateHelper.isObjectEmpty(body)) {
                result = Array.from(dataset.keys());
            } else {
                result = this.insightFetchHelper.getIndexes(dataset, body);
            }
            result = this.insightFetchHelper.indexWithNumber(dataset, result);
            result = this.insightFetchHelper.extractProperties(result, options["COLUMNS"], this.datasetCalled);
            if (("ORDER" in options)) {
                result = this.insightValidateHelper.orderByProperty(result, options["ORDER"]);
            }
            return resolve(result);
        });
    }
}
