import Scheduler from "../src/scheduler/Scheduler";
import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "../src/scheduler/IScheduler";
import {expect} from "chai";
import Log from "../src/Util";
import * as fs from "fs-extra";
import InsightFacade from "../src/controller/InsightFacade";
import Server from "../src/rest/Server";

describe("Tests for Scheduler", function () {
    before(function () {
        Log.test(`Before all`);
        // TODO: start server here once and handle errors properly
    });

    after(function () {
        // TODO: log something
        Log.test(`After: ${this.test.parent.title}`);
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // TODO
});
