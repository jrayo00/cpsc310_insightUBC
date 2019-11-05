import Log from "../Util";
import {IInsightValidateHelper} from "./IInsightValidateHelper";
import InsightFetchHelper from "./InsightFetchHelper";

/**
 * This is the validation helper class for InsightQuery.
 * Method documentation is in IInsightValidateHelper
 */
export default class InsightValidateHelper implements IInsightValidateHelper {
    public mfields: string[];
    public sfields: string[];

    constructor() {
        Log.trace("InsightQueryValidateHelperImpl::init()");
        this.mfields = [];
        this.sfields = [];
    }

    public validApply(apply: any): boolean {
        let isValid = true;
        if (Array.isArray(apply)) {
            if (apply.length > 0) {
                for (let rule in apply) {
                    isValid = isValid && this.validApplyRule(apply[rule]);
                }
            }
            return isValid;
        }
        return false;
    }

    public validApplyRule(rule: any): boolean {
        if (typeof rule === "object" && rule != null) {
            const allTheKeys = Object.keys(rule);
            if (allTheKeys.length === 1) {
                if (this.validApplyKey(allTheKeys[0])) {
                    return this.validApplyToken(Object.values(rule)[0]);
                }
            }
        }
        return false;
    }

    public validApplyToken(token: any): boolean {
        const mtokens = ["SUM", "AVG", "MAX", "MIN"];
        if (typeof token === "object" && token != null) {
            const allTheKeys = Object.keys(token);
            if (allTheKeys.length === 1) {
                if (mtokens.includes(allTheKeys[0]) && typeof Object.values(token)[0] === "string") {
                    return this.validMKey(Object.values(token)[0]);
                } else if (allTheKeys[0] === "COUNT" && typeof Object.values(token)[0] === "string") {
                    return this.validKeys(Object.values(token)[0], false);
                }
            }
        }
        return false;
    }

    public validOrder(order: any): boolean {
        const dir = ["UP", "DOWN"];
        if (typeof order === "object" && order != null) {
            // Check order["dir"] and order["keys"]
            if (dir.includes(order["dir"])) {
                return this.validKeys(order["keys"], true);
            }
        }
        return false;
    }

    public validFilter(filter: any): boolean {
        if (typeof filter === "object") {
            const allTheKeys = Object.keys(filter);
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

    public validKeys(key: any, applyKey: boolean): boolean {
        let isValid = true;
        if (typeof key === "string") {
            isValid = this.validMKey(key) || this.validSKey(key);
            if (applyKey) {
                return isValid || this.validApplyKey(key);
            }
            return isValid;
        } else if (Array.isArray(key)) {
            // Input could be an array of keys, or an array of strings
            if (key.length > 0) {
                for (let k in key) {
                    isValid = isValid && this.validKeys(key[k], applyKey);
                }
                return isValid;
            }
        }
        return false;
    }

    public validMKey(key: any): boolean {
        const coursesMfields = ["avg", "pass", "fail", "audit", "year"];
        const roomsMfields = ["lat", "lon", "seats"];
        const parts = key.split("_");
        if (parts.length === 2) {
            // First time set the valid mfields according to the dataset called
            if (parts[0].length !== 0 && this.mfields.length === 0) {
                if (coursesMfields.includes(parts[1])) {
                    this.mfields = coursesMfields;
                    return true;
                } else if (roomsMfields.includes(parts[1])) {
                    this.mfields = roomsMfields;
                    return true;
                }
                return false;
            }
            return this.mfields.includes(parts[1]) && parts[0].length !== 0;
        }
        return false;
    }

    public validSKey(key: any): boolean {
        const coursesSfields = ["dept", "id", "instructor", "title", "uuid"];
        const roomsSfields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
        const parts = key.split("_");
        if (parts.length === 2) {
            // First time set the valid mfields according to the dataset called
            if (parts[0].length !== 0 && this.sfields.length === 0) {
                if (coursesSfields.includes(parts[1])) {
                    this.sfields = coursesSfields;
                    return true;
                } else if (roomsSfields.includes(parts[1])) {
                    this.sfields = roomsSfields;
                    return true;
                }
                return false;
            }
            return this.sfields.includes(parts[1]) && parts[0].length !== 0;
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
            if (!this.validApplyKey(keyString)) {
                datasets = datasets.concat(keyString.split("_")[0]);
            }
        }
        if (typeof order === "string") {
            if (!this.validApplyKey(order)) {
                datasets = datasets.concat(order.split("_")[0]);
            }
        }
        return datasets;
    }

    public getDatasetIDInTRANSFORMATIONS(query: any, datasets: string[]): string[] {
        const cols = query["GROUP"];
        for (let item in cols) {
            let keyString = cols[item];
            datasets = datasets.concat(keyString.split("_")[0]);
        }
        return datasets;
    }

    public isObjectEmpty(obj: any): boolean {
        return Object.keys(obj).length === 0;
    }

    public areMultipleItems(obj: string[]): boolean {
        let unique = obj.filter(this.onlyUnique);
        return unique.length > 1;
    }

    public onlyUnique(value: any, index: any, self: any): boolean {
        return self.indexOf(value) === index;
    }

    public hasDuplicates(array: any[]): boolean {
        return (new Set(array)).size !== array.length;
    }

    public isSubarray(array: any[], subarray: any[]): boolean {
        return subarray.every((item) => {
            return array.indexOf(item) !== -1;
        });
    }

    public compareTo(a: {[key: string]: number | string, },
                     b: {[key: string]: number | string, }, property: string): number {
        if (this.validMKey(property) || this.validApplyKey(property)) {
            return Number(a[property]) - Number(b[property]);
        } else {
            return (a[property] > b[property]) ? 1 : ((b[property] > a[property]) ? -1 : 0);
        }
    }
}
