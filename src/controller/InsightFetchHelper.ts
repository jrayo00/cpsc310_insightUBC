import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import {IInsightFetchHelper} from "./IInsightFetchHelper";
import {IInsightQuery} from "./IInsightQuery";
import {type} from "os";
import InsightQuery from "./InsightQuery";
import InsightFacade from "./InsightFacade";
import * as fs from "fs-extra";
import {Section} from "./Section";
import {Dataset} from "./Dataset";
import InsightValidateHelper from "./InsightValidateHelper";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFetchHelper implements IInsightFetchHelper {

    constructor() {
        Log.trace("InsightQueryHelperImpl::init()");
    }

    // public insightQueryHelper: InsightValidateHelper = new InsightValidateHelper();

    // Helpers for fetching starts here
    public getDataset(datasetId: string): any {
        const cacheDir = __dirname + "/../../data/";
        // Todo: Go to cache dir "/../data" and call JSON.parse(obj)
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
        return a.filter((value) => b.includes(value));
    }

    public unionIndexes(a: number[], b: number[]): number[] {
        return [...new Set([...a, ...b])];
    }

    public indexWithNumber(result: any[], indexes: number[]): any[] {
        return indexes.map((i) => result[i]);
    }

    public filterWithNumber(result: any[], indexes: number[]): any[] {
        return result.filter((x) => !indexes.includes(x));
    }

    public extractProperties(result: any[], properties: string[], datasetCalled: string): any[] {
        let results = [];
        let copy;
        let newKey: string;
        for (let section in result) {
            let temp: any = Object.values(result[section])[0];
            copy = temp.constructor();
            for (let key in temp) {
                if (properties.includes(datasetCalled.concat("_", key))) {
                    newKey = datasetCalled.concat("_", key);
                    copy[newKey] = temp[key];
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
        // Todo: Implement this and use it
        const cacheDir = __dirname + "/../../data/";
        // Todo: Go to cache dir "/../data" and call JSON.parse(obj)
        let isAdded = false;
        for (let d in datasetIds) {
            if (datasetIds[d] === datasetId) {isAdded = true; }
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
