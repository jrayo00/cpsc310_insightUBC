/*
 * This is the primary high-level API for the project.
 * On top of InsightFacade, in this folder we add:
 * A class called InsightQuery, this should be in a file called InsightQuery.ts.
 */

export interface IInsightQuery {
    /**
     * Validate a query on UBCInsight.
     *
     * @param query  The query to be validated.
     *
     * If a query is incorrectly formatted, references a dataset not added (in memory or on disk),
     * or references multiple datasets, it should be rejected.
     *
     * @return Promise <boolean>
     *
     * The promise should fulfill with a boolean value.
     * The promise should reject with an InsightError describing the error.
     */
    validQuery(query: any, datasetIds: string[]): Promise<boolean>;

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
    validOptions(query: any): boolean;

    syntacticCheck(query: any): boolean;

    semanticCheck(query: any, datasetIds: string[]): boolean;

    orderByProperty(result: any[], property: string): any[];

    /**
     * Fetch a valid query on UBCInsight.
     *
     * @param query  The query to be performed.
     *
     * Check if the referred dataset is in memory; if so, use internal objects, otherwise pull from disk.
     * Multiple passes can be made, and either take the union or intersection of the passes.
     *
     * @return Promise <any[]>
     *
     * The promise should fulfill with an array of results.
     * The promise should reject with a ResultTooLargeError when the result exceeds 5000.
     */
    fetchQuery(query: any, datasets: any[], datasetsString: any[]): Promise<any[]>;
}
