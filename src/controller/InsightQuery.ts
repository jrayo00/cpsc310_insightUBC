import Log from "../Util";
import {InsightError} from "./IInsightFacade";
import {IInsightQuery} from "./IInsightQuery";
import InsightValidateHelper from "./InsightValidateHelper";
import InsightFetchHelper from "./InsightFetchHelper";

/**
 * This is the query handling class for the insightFacade class.
 * Method documentation is in IInsightQuery
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
            if (typeof query === "object" && query !== null) {
                // Semantic checking only if the query is syntactically valid
                if (this.syntacticCheck(query)) {
                    if (this.semanticCheck(query, datasetIds)) {
                        return resolve(true);
                    }
                }
            }
            return reject(new InsightError("Invalid query"));
        });
    }

    public syntacticCheck(query: any): boolean {
        let isValid = false;
        const allTheKeys = Object.keys(query);
        if (allTheKeys.length > 1 && allTheKeys.length < 4 && "WHERE" in query && "OPTIONS" in query) {
            if (!this.insightValidateHelper.isObjectEmpty(query["WHERE"])) {
                isValid = this.validFilter(query["WHERE"]) && this.validOptions(query["OPTIONS"]);
            } else {
                isValid = this.validOptions(query["OPTIONS"]);
            }
            if (allTheKeys.length === 3 && isValid) {
                return this.validTrans(query["TRANSFORMATION"]);
            }
        }
        return isValid;
    }

    public validTrans(trans: any): boolean {
        if (typeof trans === "object" && trans !== null) {
            // Todo: Validate TRANSFORMATION
            return true;
        }
        return false;
    }

    public validFilter(filter: any): boolean {
        // Check if the input is a JSON object
        if (typeof filter === "object") {
            const allTheKeys = Object.keys(filter);
            // Check if query is empty
            if (allTheKeys.length === 1) {
                switch (allTheKeys[0]) {
                    case "AND":
                        return this.insightValidateHelper.validLogicComparison(filter["AND"]);
                    case "OR":
                        return this.insightValidateHelper.validLogicComparison(filter["OR"]);
                    case "NOT":
                        return this.validFilter(filter["NOT"]);
                    case "LT":
                        return this.insightValidateHelper.validMComparison(filter["LT"]);
                    case "GT":
                        return this.insightValidateHelper.validMComparison(filter["GT"]);
                    case "EQ":
                        return this.insightValidateHelper.validMComparison(filter["EQ"]);
                    case "IS":
                        return this.insightValidateHelper.validSComparison(filter["IS"]);
                    default:
                        return false;
                }
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
                    return this.insightValidateHelper.validColumns(options["COLUMNS"]);
                case 2:
                    if (typeof options["ORDER"] === "object") {
                        // If both COLUMNS and OPTIONS are valid, check if COLUMNS contains ORDER
                        if (this.insightValidateHelper.validColumns(options["COLUMNS"]) &&
                            this.insightValidateHelper.validOrder(options["ORDER"])) {
                            const order = options["ORDER"];
                            return options["COLUMNS"].includes(order["keys"]);
                        }
                    } else {
                        if (this.insightValidateHelper.validColumns(options["COLUMNS"]) &&
                            this.insightValidateHelper.validOrderString(options["ORDER"])) {
                            return options["COLUMNS"].includes(options["ORDER"]);
                        }
                    }
            }
        }
        return false;
    }

    public semanticCheck(query: any, datasetIds: string[]): boolean {
        // Know the query is valid syntactically, return false if multiple datasets selected
        let datasets: string[] = [];
        datasets = this.insightValidateHelper.getDatasetIDInWHERE(query["WHERE"], datasets);
        datasets = this.insightValidateHelper.getDatasetIDInOPTIONS(query["OPTIONS"], datasets);
        // Todo: if (!this.insightValidateHelper.isObjectEmpty(query["TRANSFORMATION"]))
        // Todo: datasets = this.insightValidateHelper.getDatasetIDInOPTIONS(query["TRANSFORMATION"], datasets);
        let isValid = !this.insightValidateHelper.areMultipleDatasets(datasets);
        this.datasetCalled = datasets[0];
        // Only check if the dataset is added when the query is valid at this point
        if (isValid) {
            isValid = this.insightFetchHelper.isAdded(this.datasetCalled, datasetIds);
        }
        return isValid;
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
            result = this.insightFetchHelper.extractProperties(result, options["COLUMNS"], this.datasetCalled);
            if (("ORDER" in options)) {
                result = this.insightValidateHelper.orderByProperty(result, options["ORDER"]);
            }
            return resolve(result);
        });
    }
}
