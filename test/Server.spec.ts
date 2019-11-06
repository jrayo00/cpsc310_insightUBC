import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import Log from "../src/Util";
import * as fs from "fs-extra";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    // Added fields
    const cacheDir = __dirname + "/../data";
    const serverURL = "http://localhost:4321";

    chai.use(chaiHttp);

    before(function () {
        Log.test(`Before all`);
        facade = new InsightFacade();
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        server.start().then(function (val: boolean) {
            Log.info("Server.spec.ts::before() - started: " + val);
        }).catch(function (err: Error) {
            Log.error("Server.spec.ts::before() - ERROR: " + err.message);
        });
    });

    after(function () {
        // TODO: stop server here once!
        server.stop().then(function (val: boolean) {
            Log.info("Server.spec.ts::after() - stopped: " + val);
        }).catch(function (err: Error) {
            Log.error("Server.spec.ts::after() - ERROR: " + err.message);
        });
        Log.test(`After: ${this.test.parent.title}`);
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            facade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // TODO: read your courses and rooms datasets here once!
    const buffers: { [id: string]: any } = {
        courses: fs.readFileSync("./test/data/courses.zip"),
        invalid: fs.readFileSync("./test/data/invalid.zip"),
        missingkeys: fs.readFileSync("./test/data/missingkeys.zip"),
        novalidsections: fs.readFileSync("./test/data/novalidsections.zip"),
        rooms: fs.readFileSync("./test/data/rooms.zip"),
    };

    // Sample on how to format PUT requests
    it("Success PUT test for courses dataset", function () {
        const endpointURL = "/dataset/courses0/courses";
        const expected: string[] = ["courses0"];
        try {
            return chai.request(serverURL)
                .put(endpointURL)
                .send(buffers["courses"])
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    // expect(res.status).to.be.equal(200);
                    expect(res.body["result"]).to.deep.equal(expected);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
