import Scheduler from "../src/scheduler/Scheduler";
import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "../src/scheduler/IScheduler";
import {expect} from "chai";
import Log from "../src/Util";
import * as fs from "fs-extra";

describe("Tests for Scheduler", function () {
    let scheduler: Scheduler;
    let sections: SchedSection[];
    let rooms: SchedRoom[];

    const section0: SchedSection = {
        courses_dept: "cpsc",
        courses_id: "340",
        courses_uuid: "1319",
        courses_pass: 101,
        courses_fail: 7,
        courses_audit: 2
    };
    const section1: SchedSection = {
        courses_dept: "cpsc",
        courses_id: "340",
        courses_uuid: "3397",
        courses_pass: 171,
        courses_fail: 3,
        courses_audit: 1
    };
    const section2: SchedSection = {
        courses_dept: "cpsc",
        courses_id: "344",
        courses_uuid: "62413",
        courses_pass: 93,
        courses_fail: 2,
        courses_audit: 0
    };
    const section3: SchedSection = {
        courses_dept: "cpsc",
        courses_id: "344",
        courses_uuid: "72385",
        courses_pass: 43,
        courses_fail: 1,
        courses_audit: 0
    };
    const section4: SchedSection = {
        courses_dept: "cpsc",
        courses_id: "340",
        courses_uuid: "1320",
        courses_pass: 101,
        courses_fail: 7,
        courses_audit: 2
    };
    const section5: SchedSection = {
        courses_dept: "cpsc",
        courses_id: "340",
        courses_uuid: "3398",
        courses_pass: 171,
        courses_fail: 3,
        courses_audit: 1
    };
    const section6: SchedSection = {
        courses_dept: "cpsc",
        courses_id: "344",
        courses_uuid: "62414",
        courses_pass: 93,
        courses_fail: 2,
        courses_audit: 0
    };
    const section7: SchedSection = {
        courses_dept: "cpsc",
        courses_id: "344",
        courses_uuid: "72386",
        courses_pass: 43,
        courses_fail: 1,
        courses_audit: 0
    };
    const room0: SchedRoom = {
        rooms_shortname: "AERL",
        rooms_number: "120",
        rooms_seats: 144,
        rooms_lat: 49.26372,
        rooms_lon: -123.25099
    };
    const room1: SchedRoom = {
        rooms_shortname: "ANGU",
        rooms_number: "099",
        rooms_seats: 60,
        rooms_lat: 49.26486,
        rooms_lon: -123.25364
    };
    const room2: SchedRoom = {
        rooms_shortname: "ANGU",
        rooms_number: "098",
        rooms_seats: 160,
        rooms_lat: 49.26486,
        rooms_lon: -123.25364
    };
    const room3: SchedRoom = {
        rooms_shortname: "BUCH",
        rooms_number: "A101",
        rooms_seats: 170,
        rooms_lat: 49.26826,
        rooms_lon: -123.25468
    };

    before(function () {
        Log.test(`Before all`);
        scheduler = new Scheduler();
    });

    after(function () {
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

    it("Sample Scheduler test", function () {
        sections = [section0, section1, section2, section3, section4, section5, section6, section7];
        rooms = [room0, room1, room2, room3];
        let expected = [[room2, section0, "MWF 0800-0900"], [room2, section1, "MWF 0900-1000"],
            [room2, section4, "MWF 1000-1100"], [room2, section5, "MWF 1100-1200"],
            [room0, section2, "MWF 0800-0900"], [room0, section3, "MWF 0900-1000"],
            [room0, section6, "MWF 1000-1100"], [room0, section7, "MWF 1100-1200"]];
        expect(scheduler.schedule(sections, rooms)).to.deep.equal(expected);
    });
});
