import Log from "../Util";
import {IInsightValidateHelper} from "./IInsightValidateHelper";
import InsightFetchHelper from "./InsightFetchHelper";

/**
 * This is the validation helper class for InsightQuery.
 * Method documentation is in IInsightValidateHelper
 */
export default class InsightValidateHelper implements IInsightValidateHelper {
    public insightFetchHelper: InsightFetchHelper;

    constructor() {
        Log.trace("InsightQueryHelperImpl::init()");
        this.insightFetchHelper = new InsightFetchHelper();
    }

    public validColumns(cols: any): boolean {
        if (Array.isArray(cols)) {
            // COLUMNS array cannot be empty
            if (cols.length > 0) {
                return this.validKeys(cols);
            }
        }
        return false;
    }

    public validOrderKeys(order: any): boolean {
        if (typeof order === "string") {
            return this.validKeys(order);
        }
        return false;
    }

    public validOrder(order: any): boolean {
        const dir = ["UP", "DOWN"];
        let isValid = true;
        if (typeof order === "object" && order != null) {
            // Todo: Check order["dir"] and order["keys"]
            if (dir.includes(order["dir"])) {
                if (Array.isArray(order["keys"])) {
                    const keys = order["keys"];
                    for (let k in keys) {
                        isValid = isValid && this.validOrderKeys(keys[k]);
                    }
                    return isValid;
                }
            }
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
                        return this.validLogicComparison(filter["AND"]);
                    case "OR":
                        return this.validLogicComparison(filter["OR"]);
                    case "NOT":
                        return this.validFilter(filter["NOT"]);
                    case "LT":
                        return this.validMComparison(filter["LT"]);
                    case "GT":
                        return this.validMComparison(filter["GT"]);
                    case "EQ":
                        return this.validMComparison(filter["EQ"]);
                    case "IS":
                        return this.validSComparison(filter["IS"]);
                    default:
                        return false;
                }
            }
        }
        return false;
    }

    public validLogicComparison(filters: any): boolean {
        // Should have a for loop, loop over the array of filters
        let isValid = true;
        if (Array.isArray(filters)) {
            // COLUMNS array cannot be empty
            if (filters.length > 0) {
                for (let filter in filters) {
                    isValid = isValid && this.validFilter(filters[filter]);
                }
                return isValid;
            }
        }
        return false;
    }

    public validMComparison(item: any): boolean {
        if (typeof item === "object") {
            const allTheKeys = Object.keys(item);
            if (allTheKeys.length === 1) {
                if (this.validMKey(allTheKeys[0]) && typeof item[allTheKeys[0]] === "number") {
                    return true;
                }
            }
        }
        return false;
    }

    public validSComparison(item: any): boolean {
        if (typeof item === "object") {
            const allTheKeys = Object.keys(item);
            if (allTheKeys.length === 1) {
                if (this.validSKey(allTheKeys[0]) && this.validInputstring(item[allTheKeys[0]])) {
                    return true;
                }
            }
        }
        return false;
    }

    public validInputstring(inputstring: any): boolean {
        let isValid = true;
        if (typeof inputstring === "string") {
            if (inputstring.length > 1) {
                inputstring = inputstring.substring(1, inputstring.length - 1);
                if (inputstring.includes("*")) {
                    isValid = false;
                }
            }
        } else {
            isValid = false;
        }
        return isValid;
    }

    public validKeys(key: any): boolean {
        let isValid = true;
        if (typeof key === "string") {
            return this.validMKey(key) || this.validSKey(key) || this.validApplyKey(key);
        } else if (Array.isArray(key)) {
            // Input could be an array of keys, or an array of strings
            for (let k in key) {
                isValid = isValid && this.validKeys(key[k]);
            }
            return isValid;
        }
        return false;
    }

    public validMKey(key: any): boolean {
        const mfields = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
        const parts = key.split("_");
        if (parts.length === 2) {
            return mfields.includes(parts[1]) && parts[0].length !== 0;
        }
        return false;
    }

    public validSKey(key: any): boolean {
        const sfields = ["dept", "id", "instructor", "title", "uuid",
            "fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
        const parts = key.split("_");
        if (parts.length === 2) {
            return sfields.includes(parts[1]) && parts[0].length !== 0;
        }
        return false;
    }

    public validApplyKey(key: any): boolean {
        return !key.includes("_") && key.length > 0;
    }

    public getDatasetIDInWHERE(query: any, datasets: string[]): string[] {
        const logics = ["AND", "OR"];
        const comparators = ["LT", "GT", "EQ", "IS"];
        const negation = ["NOT"];
        // Know the query is valid syntactically, return false if multiple datasets selected
        const key = Object.keys(query)[0];
        if (logics.includes(key)) {
            let array = query[key];
            for (let item in array) {
                datasets = datasets.concat(this.getDatasetIDInWHERE(array[item], datasets));
            }
        } else if (comparators.includes(key)) {
            let item = query[key];
            let keyString = Object.keys(item)[0];
            datasets = datasets.concat(keyString.split("_")[0]);
        } else if (negation.includes(key)) {
            datasets = datasets.concat(this.getDatasetIDInWHERE(query[key], datasets));
        }
        return datasets;
    }

    public getDatasetIDInOPTIONS(query: any, datasets: string[]): string[] {
        const cols = query["COLUMNS"];
        const order = query["ORDER"];
        for (let item in cols) {
            let keyString = cols[item];
            datasets = datasets.concat(keyString.split("_")[0]);
        }
        if (typeof order === "string") {
            datasets = datasets.concat(order.split("_")[0]);
        }
        return datasets;
    }

    public isObjectEmpty(obj: any): boolean {
        return Object.keys(obj).length === 0;
    }

    public areMultipleDatasets(obj: string[]): boolean {
        let unique = obj.filter(this.onlyUnique);
        return unique.length > 1;
    }

    public onlyUnique(value: any, index: any, self: any): boolean {
        return self.indexOf(value) === index;
    }

    public orderByProperty(result: any[], property: string): any[] {
        let sorted: any[] = [];
        if (this.validMKey(property)) {
            sorted = result.sort((a, b) => {
                return Number(a[property]) - Number(b[property]);
            });
            return sorted;
        } else {
            sorted = result.sort((a, b) => {
                return (a[property] > b[property]) ? 1 : ((b[property] > a[property]) ? -1 : 0);
            });
            return sorted;
        }
    }
}
