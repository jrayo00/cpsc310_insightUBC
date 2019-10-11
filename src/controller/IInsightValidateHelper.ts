/*
 * This is the primary high-level API for the project.
 * On top of InsightFacade, in this folder we add:
 * A class called InsightValidateHelper, this should be in a file called InsightValidateHelper.ts.
 */

export interface IInsightValidateHelper {
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

    orderByProperty(result: any[], property: string): any[];
}
