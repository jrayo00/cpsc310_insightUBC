import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import InsightValidateHelper from "./InsightValidateHelper";

/*
 * This is the primary high-level API for the project.
 * On top of InsightFacade, in this folder we add:
 * A class called InsightQuery, this should be in a file called InsightQuery.ts.
 */

export interface IInsightFetchHelper {
    // insightQueryHelper: InsightValidateHelper;
    // Helpers for fetching starts here
    getDataset(datasetName: string): any;

    intersectIndexes(a: number[], b: number[]): number[];

    unionIndexes(a: number[], b: number[]): number[];

    indexWithNumber(result: any[], indexes: number[]): any[];

    filterWithNumber(result: any[], indexes: number[]): any[];

    // orderByProperty(result: any[], property: string): any[];

    extractProperties(result: any[], properties: string[], datasetCalled: string): any[];

    getRegex(value: string): string;

    isAdded(datasetId: string, datasetIds: string[]): boolean;

    getIndexesLT(dataset: any[], item: any): number[];

    getIndexesGT(dataset: any[], item: any): number[];

    getIndexesEQ(dataset: any[], item: any): number[];

    getIndexesIS(dataset: any[], item: any): number[];
}
