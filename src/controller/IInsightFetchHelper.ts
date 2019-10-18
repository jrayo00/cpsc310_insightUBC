/*
 * This is the primary high-level API for the project.
 * On top of InsightFacade, in this folder we add:
 * A class called InsightFetchHelper, this should be in a file called InsightFetchHelper.ts.
 */

export interface IInsightFetchHelper {
    getDataset(datasetName: string): any;

    intersectIndexes(a: number[], b: number[]): number[];

    unionIndexes(a: number[], b: number[]): number[];

    indexWithNumber(result: any[], indexes: number[]): any[];

    filterWithNumber(result: any[], indexes: number[]): any[];

    extractProperties(result: any[], properties: string[], datasetCalled: string): any[];

    getRegex(value: string): string;

    getIndexes(dataset: any[], query: any): number[];

    getIndexesLT(dataset: any[], item: any): number[];

    getIndexesGT(dataset: any[], item: any): number[];

    getIndexesEQ(dataset: any[], item: any): number[];

    getIndexesIS(dataset: any[], item: any): number[];
}
