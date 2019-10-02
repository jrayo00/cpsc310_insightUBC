import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import {IInsightQueryHelper} from "./IInsightQueryHelper";
import InsightFetchHelper from "./InsightFetchHelper";
import {IInsightQuery} from "./IInsightQuery";
import {type} from "os";
import InsightQuery from "./InsightQuery";
import InsightFacade from "./InsightFacade";
import * as fs from "fs-extra";
import {Section} from "./Section";
import {Dataset} from "./Dataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightQueryHelper implements IInsightQueryHelper {

    constructor() {
        Log.trace("InsightQueryHelperImpl::init()");
    }

    public insightFetchHelper: InsightFetchHelper = new InsightFetchHelper();

    public validLogicComparison(filters: any): boolean {
        // Should have a for loop, loop over the array of filters
        let insightQuery: InsightQuery;
        insightQuery = new InsightQuery();
        let isValid = true;
        if (Array.isArray(filters)) {
            // COLUMNS array cannot be empty
            if (filters.length > 0) {
                for (let filter in filters) {
                    isValid = isValid && insightQuery.validFilter(filters[filter]);
                }
            } else {
                isValid = false;
            }
        } else {
            isValid = false;
        }
        return isValid;
    }

    public validMComparison(item: any): boolean {
        let isValid = true;
        if (typeof item === "object") {
            const allTheKeys = Object.keys(item);
            if (allTheKeys.length === 1) {
                if (!this.validMKey(allTheKeys[0]) || typeof item[allTheKeys[0]] !== "number") {
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

    public validSComparison(item: any): boolean {
        let isValid = true;
        if (typeof item === "object") {
            const allTheKeys = Object.keys(item);
            if (allTheKeys.length === 1) {
                if (!this.validSKey(allTheKeys[0]) || !this.validInputstring(item[allTheKeys[0]])) {
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

    public validInputstring(inputstring: any): boolean {
        let isValid = true;
        if (typeof inputstring === "string") {
            inputstring = inputstring.substring(1, inputstring.length - 1);
            if (inputstring.includes("*")) {
                isValid = false;
            }
        } else {
            isValid = false;
        }
        return isValid;
    }

    public validKeys(key: any): boolean {
        let isValid = true;
        if (typeof key === "string") {
            isValid = this.validMKey(key) || this.validSKey(key);
        } else if (Array.isArray(key)) {
            // Input could be an array of keys, or an array of strings
            for (let k in key) {
                isValid = isValid && this.validKeys(key[k]);
            }
        } else {
            isValid = false;
        }
        return isValid;
    }

    public validMKey(key: any): boolean {
        let isValid = true;
        const mfields = ["avg", "pass", "fail", "audit", "year"];
        const parts = key.split("_");
        if (parts.length === 2) {
            isValid = mfields.includes(parts[1]) && parts[0].length !== 0;
        } else {
            isValid = false;
        }
        return isValid;
    }

    public validSKey(key: any): boolean {
        let isValid = true;
        const sfields = ["dept", "id", "instructor", "title", "uuid"];
        const parts = key.split("_");
        if (parts.length === 2) {
            isValid = sfields.includes(parts[1]) && parts[0].length !== 0;
        } else {
            isValid = false;
        }
        return isValid;
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
            sorted = result.sort((a, b) => (a[property] > b[property]) ? 1 : ((b[property] > a[property]) ? -1 : 0));
            return sorted;
        }
    }
}
