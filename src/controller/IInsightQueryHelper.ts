import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";

/*
 * This is the primary high-level API for the project.
 * On top of InsightFacade, in this folder we add:
 * A class called InsightQuery, this should be in a file called InsightQuery.ts.
 */

export interface IInsightQueryHelper {
    /**
     * Validate the options of a query on UBCInsight.
     *
     * @param query  The options of the query to be validated.
     *
     * If a query is incorrectly formatted, references a dataset not added (in memory or on disk),
     * or references multiple datasets, it should be rejected.
     *
     * @return Promise <boolean>
     *
     * The promise should fulfill with a boolean value.
     * The promise should reject with a NotFoundError when the dataset is not found.
     * The promise should reject with an InsightError describing other errors.
     */
    validKeys(query: any): boolean;

    validMKey(query: any): boolean;

    validSKey(query: any): boolean;

    validMComparison(query: any): boolean;

    validSComparison(query: any): boolean;

    validInputstring(query: any): boolean;

    validLogicComparison(query: any): boolean;

    getDatasetIDInWHERE(query: any, datasets: string[]): string[];

    getDatasetIDInOPTIONS(query: any, datasets: string[]): string[];

    isObjectEmpty(obj: any): boolean;

    areMultipleDatasets(obj: string[]): boolean;

    onlyUnique(value: any, index: any, self: any): boolean;

    // Helpers for fetching starts here
    getDataset(datasetName: string): any[];

    intersectIndexes(a: number[], b: number[]): number[];

    unionIndexes(a: number[], b: number[]): number[];

    indexWithNumber(result: any[], indexes: number[]): any[];

    filterWithNumber(result: any[], indexes: number[]): any[];

    orderByProperty(result: any[], property: string): any[];

    extractProperties(result: any[], properties: string[], datasetCalled: string): any[];

    getRegex(value: string): string;

    isAdded(datasetId: string, datasetIds: string[]): boolean;

    getIndexesLT(dataset: any[], item: any): number[];

    getIndexesGT(dataset: any[], item: any): number[];

    getIndexesEQ(dataset: any[], item: any): number[];

    getIndexesIS(dataset: any[], item: any): number[];
}
