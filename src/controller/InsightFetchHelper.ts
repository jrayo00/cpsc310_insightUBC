import Log from "../Util";
import {IInsightFetchHelper} from "./IInsightFetchHelper";
import * as fs from "fs-extra";
import {Section} from "./Section";
import {Dataset} from "./Dataset";

/**
 * This is the data fetching helper class for InsightQuery.
 * Method documentation is in IInsightValidateHelper
 */
export default class InsightFetchHelper implements IInsightFetchHelper {

    constructor() {
        Log.trace("InsightQueryFetchHelperImpl::init()");
    }

    // Helpers for fetching starts here
    public getDataset(datasetId: string): any {
        const cacheDir = __dirname + "/../../data/";
        const dataset = fs.readFileSync(cacheDir + datasetId + ".txt", "text");
        let obj = JSON.parse(dataset);
        let sections = [];
        // Log.test(obj.result.length);
        for (let item of obj.allSections) {
            // iterate through result array and get the key value pairs
            let newSection: Section = new Section();
            newSection.info.dept = item.info.dept;
            newSection.info.id = item.info.id;
            newSection.info.avg = item.info.avg;
            newSection.info.instructor = item.info.instructor;
            newSection.info.title = item.info.title;
            newSection.info.pass = item.info.pass;
            newSection.info.fail = item.info.fail;
            newSection.info.audit = item.info.audit;
            newSection.info.uuid = item.info.uuid;
            newSection.info.year = item.info.year;
            sections.push(newSection);
        }
        let newDataset: Dataset = new Dataset(datasetId, obj.kind);
        newDataset.numRows = obj.numRows;
        newDataset.allSections = sections;
        return newDataset;
    }

    public intersectIndexes(a: number[], b: number[]): number[] {
        return a.filter((value) => {
            return b.includes(value);
        });
    }

    public unionIndexes(a: number[], b: number[]): number[] {
        return [...new Set([...a, ...b])];
    }

    public indexWithNumber(result: any[], indexes: number[]): any[] {
        return indexes.map((i) => {
            return result[i];
        });
    }

    public filterWithNumber(result: any[], indexes: number[]): any[] {
        return result.filter((x) => {
            return !indexes.includes(x);
        });
    }

    public extractProperties(result: any[], properties: string[], datasetCalled: string): any[] {
        let results = [];
        let copy;
        let newKey: string;
        for (let section in result) {
            // Get the object with info key
            let temp: any = Object.values(result[section])[0];
            let idKeys = Object.keys(temp).map((v: any) => {
                // Append the dataset id as prefix
                return datasetCalled.concat("_", v);
            });
            copy = temp.constructor();
            // First, handle existing columns
            for (let key in temp) {
                if (properties.includes(datasetCalled.concat("_", key))) {
                    newKey = datasetCalled.concat("_", key);
                    copy[newKey] = temp[key];
                }
            }
            // Then, handle the applyKey case
            for (let p in properties) {
                let applyKey = properties[p];
                if (!idKeys.includes(applyKey)) {
                    copy[applyKey] = temp[applyKey];
                }
            }
            results.push(copy);
        }
        return results;
    }

    public getRegex(value: string): string {
        // $& means the whole matched string, remove the * after .
        value = value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
        return value.replace(/[*]/g, ".*");
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

    public getIndexes(dataset: any[], query: any): number[] {
        let indexes: number[] = [];
        let item: any;
        const allTheKeys = Object.keys(query);
        switch (allTheKeys[0]) {
            case "AND":
                item = query["AND"];
                indexes = Array.from(dataset.keys());
                for (let filter in item) {
                    indexes = this.intersectIndexes(indexes, this.getIndexes(dataset, item[filter]));
                }
                return indexes;
            case "OR":
                item = query["OR"];
                for (let filter in item) {
                    indexes = this.unionIndexes(indexes, this.getIndexes(dataset, item[filter]));
                }
                return indexes;
            case "NOT":
                indexes = this.getIndexes(dataset, query["NOT"]);
                return this.filterWithNumber(Array.from(dataset.keys()), indexes);
            case "LT":
                item = query["LT"];
                return this.getIndexesLT(dataset, item);
            case "GT":
                item = query["GT"];
                return this.getIndexesGT(dataset, item);
            case "EQ":
                item = query["EQ"];
                return this.getIndexesEQ(dataset, item);
            case "IS":
                item = query["IS"];
                return this.getIndexesIS(dataset, item);
        }
    }

    public getIndexesLT(dataset: any[], item: any): number[] {
        let field = Object.keys(item)[0];
        let value = item[field];
        let indexes: number[] = [];
        for (let section in dataset) {
            let info = dataset[section].info;
            if (info[field.split("_")[1]] < value) {
                indexes.push(Number(section));
            }
        }
        return indexes;
    }

    public getIndexesGT(dataset: any[], item: any): number[] {
        let field = Object.keys(item)[0];
        let value = item[field];
        let indexes: number[] = [];
        for (let section in dataset) {
            let info = dataset[section].info;
            if (info[field.split("_")[1]] > value) {
                indexes.push(Number(section));
            }
        }
        return indexes;
    }

    public getIndexesEQ(dataset: any[], item: any): number[] {
        let field = Object.keys(item)[0];
        let value = item[field];
        let indexes: number[] = [];
        for (let section in dataset) {
            let info = dataset[section].info;
            if (info[field.split("_")[1]] === value) {
                indexes.push(Number(section));
            }
        }
        return indexes;
    }

    public getIndexesIS(dataset: any[], item: any): number[] {
        let field = Object.keys(item)[0];
        let value = item[field];
        let reg = new RegExp("^" + this.getRegex(value) + "$");
        let indexes: number[] = [];
        for (let section in dataset) {
            let info = dataset[section].info;
            if (reg.test(info[field.split("_")[1]])) {
                indexes.push(Number(section));
            }
        }
        return indexes;
    }
}
