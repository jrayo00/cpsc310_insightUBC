/*
 * This is the primary high-level API for the project.
 * On top of InsightFacade, in this folder we add:
 * A class called InsightFetchHelper, this should be in a file called InsightFetchHelper.ts.
 */

export interface IInsightTransformHelper {
    transformQuery(result: any[], trans: any): any[];

    groupBy(result: any[], f: any): any[];
}
