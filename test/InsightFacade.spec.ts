import { expect } from "chai";
import * as fs from "fs-extra";
import {InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import * as assert from "assert";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courses2: "./test/data/courses2.zip",
        courses3: "./test/data/courses3.zip",
        courses_with_underscore: "./test/data/courses_with_underscore.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should add a valid dataset: testing Rooms dataset kind", function () {
        const id: string = "courses2";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should not add a duplicate dataset with same id", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        // Adding dataset the first time
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should not have been accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add a dataset without valid a valid json file", function () {
        const id: string = "courses3";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should not have been accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add a dataset with underscore in id", function () {
        const id: string = "courses_with_underscore";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should not have been accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add a dataset with all whitespaces for id", function () {
        const id: string = "   ";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should not have been accepted");
            // tslint:disable-next-line:no-empty
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add a dataset id null", function () {
        const id: string = null;
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should not have been accepted");
            // tslint:disable-next-line:no-empty
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add a dataset id undefined", function () {
        const id: string = undefined;
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should not have been accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // Testing remove dataset function
    it("Should remove a valid dataset", function () {
        const id: string = "courses2";
        const expected: string = id;
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return insightFacade.removeDataset(id).then((result: string) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Removing dataset should reject with a NotFoundError", function () {
        const id: string = "courses3";
        const expected: string = id;
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, expected, "Should not have removed dataset whose id DNE");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(NotFoundError);
        });
    });
    it("Removing dataset should reject with a InsightError: underscore in id", function () {
        const id: string = "invalid_id";
        const expected: string = id;
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, expected, "Should not have removed dataset whose id DNE");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Removing dataset should reject with a InsightError: all whitespaces for id", function () {
        const id: string = "    ";
        const expected: string = id;
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, expected, "Should not have removed dataset whose id DNE");
        }).catch((err: any) => {
            // **TODO: FIGURE OUT HOW TO VALIDATE A CERTAIN EXCEPTION WAS THROWN
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Removing dataset with id null", function () {
        const id: string = null;
        const expected: string = id;
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, expected, "Should not have removed dataset whose id null");
        }).catch((err: any) => {
            expect(insightFacade.removeDataset(id)).to.throw();
        });
    });
    it("Removing dataset with id undefined", function () {
        const id: string = undefined;
        const expected: string = id;
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, expected, "Should not have removed dataset whose id undefined");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
});
// TODO: add unit tests for ids with null or undefined
// TODO: add the zip files for the necessary datasets being added/removed

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: any } = {
        courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
    };
    let insightFacade: InsightFacade = new InsightFacade();
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        for (const key of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[key];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(ds.id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * For D1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });
});
