import Log from "../Util";
import {IInsightTransformHelper} from "./IInsightTransformHelper";
import {Decimal} from "decimal.js";

/**
 * This is the data fetching helper class for InsightQuery.
 * Method documentation is in IInsightTransformHelper
 */
export default class InsightTransformHelper implements IInsightTransformHelper {

    constructor() {
        Log.trace("InsightQueryTransformHelperImpl::init()");
    }

    // TODO: Should return an array of objects that is ready for extraction
    public transformQuery(result: any[], trans: any): any[] {
        let groupedCols = trans["GROUP"].map((v: any) => {
            // Ignore the dataset id
            return v.split("_")[1];
        });
        // Group fetched result according to the GROUP clause
        let groupedResult = this.groupBy(result, (info: any) => {
            let items: any[] = [];
            for (let i in groupedCols) {
                let col = groupedCols[i];
                let item = info.info;
                items = items.concat(item[col]);
            }
            // Return the value of the sorting properties
            return items;
        });
        // Compute aggregation according to the APPLY clause
        let transformedResult = this.computeAgg(groupedResult, trans["APPLY"]);
        // Get the first object of each group
        transformedResult = this.deduplicate(transformedResult);
        return transformedResult;
    }

    public computeAgg(result: any[], applys: any[]): any[] {
        for (let a in applys) {
            let apply = applys[a];
            let applyKey = Object.keys(apply)[0];
            apply = apply[applyKey];
            let applyToken = Object.keys(apply)[0];
            let col = apply[applyToken];
            col = col.split("_")[1];
            switch (applyToken) {
                case "COUNT":
                    result = this.applyCOUNT(result, applyKey, col);
                    break;
                case "MAX":
                    result = this.applyMAX(result, applyKey, col);
                    break;
                case "MIN":
                    result = this.applyMIN(result, applyKey, col);
                    break;
                case "SUM":
                    result = this.applySUM(result, applyKey, col);
                    break;
                case "AVG":
                    result = this.applyAVG(result, applyKey, col);
                    break;
            }
        }
        return result;
    }

    public deduplicate(result: any[][]): any[] {
        let deduplicated: any[] = [];
        for (let i in result) {
            deduplicated = deduplicated.concat(result[i][0]);
        }
        return deduplicated;
    }

    public addProperty(array: any[], newProperty: string, val: any): any[] {
        array.forEach((e) => {
            // Adapt to the data structure
            e.info[newProperty] = val;
        });
        let result = JSON.stringify(array);
        return JSON.parse(result);
    }

    public applyMAX(result: any[][], applyKey: string, col: string): any[][] {
        // For each group in groupedResult
        for (let i in result) {
            let group = result[i];
            let max = Math.max.apply(Math, group.map((o) => {
                return Number(o.info[col]);
            }));
            // Add the local max as a new property
            result[i] = this.addProperty(result[i], applyKey, max);
        }
        return result;
    }

    public applyMIN(result: any[][], applyKey: string, col: string): any[][] {
        // For each group in groupedResult
        for (let i in result) {
            let group = result[i];
            let min = Math.min.apply(Math, group.map((o) => {
                return Number(o.info[col]);
            }));
            // Add the local min as a new property
            result[i] = this.addProperty(result[i], applyKey, min);
        }
        return result;
    }

    public applyCOUNT(result: any[][], applyKey: string, col: string): any[][] {
        // For each group in groupedResult
        for (let i in result) {
            let group = result[i];
            // Get an array of the property values
            let colValues = group.map((a) => {
                return a.info[col];
            });
            // Add the group count as a new property
            result[i] = this.addProperty(result[i], applyKey, this.countUnique(colValues));
        }
        return result;
    }

    public countUnique(array: any[]): number {
        return new Set(array).size;
    }

    public applySUM(result: any[][], applyKey: string, col: string): any[][] {
        // For each group in groupedResult
        for (let i in result) {
            let group = result[i];
            let total = group.reduce((a, b) => {
                return a + b.info[col];
                }, 0);
            // Add the group sum as a new property
            result[i] = this.addProperty(result[i], applyKey, Number(total.toFixed(2)));
        }
        return result;
    }

    public applyAVG(result: any[][], applyKey: string, col: string): any[][] {
        // For each group in groupedResult
        for (let i in result) {
            let group = result[i];
            let total = group.reduce((a, b) => {
                let decimalA = new Decimal(a);
                let decimalB = new Decimal(b.info[col]);
                return decimalA.add(decimalB);
                }, 0);
            // Add the local max as a new property
            const avg = total.toNumber() / group.length;
            result[i] = this.addProperty(result[i], applyKey, Number(avg.toFixed(2)));
        }
        return result;
    }

    // TODO: Should return an array of arrays of objects (e.g., courses or rooms)
    public groupBy(result: any[], f: any): any[][] {
        let groups: {[key: string]: any; } = {};
        result.forEach((o) => {
            let group = JSON.stringify(f(o));
            groups[group] = groups[group] || [];
            groups[group].push(o);
        });
        return Object.keys(groups).map((group) => {
            return groups[group];
        });
    }
}
