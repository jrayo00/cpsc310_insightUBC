/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import {InsightDatasetKind} from "../controller/IInsightFacade";
import {InsightError} from "../controller/IInsightFacade";
import {NotFoundError} from "../controller/IInsightFacade";
import {InsightDataset} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;

    // Added fields
    private insightFacade: InsightFacade;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
        // Initialize insightFacade
        this.insightFacade = new InsightFacade();
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");
                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // TODO: my implementation
                that.rest.put("/dataset/:id/:kind", (req: restify.Request, res: restify.Response,
                                                     next: restify.Next) => {
                    that.putHandler(req, res, next).then((r) => {
                        return next();
                    });
                });
                that.rest.del("/dataset/:id", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    that.delHandler(req, res, next).then((r) => {
                        return next();
                    });
                });
                that.rest.post("/query", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    that.postHandler(req, res, next).then((r) => {
                        return next();
                    });
                });
                that.rest.get("/datasets", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    that.getHandler(req, res, next).then((r) => {
                        return next();
                    });
                });

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);
                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });
                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });
            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    private putHandler(req: restify.Request, res: restify.Response, next: restify.Next) {
        // req.body contains data from zip
        const content = req.body.toString("base64");
        // req.params.id contains datasetId
        const datasetId = req.params.id;
        // req.params.kind contains dataset type
        let datasetType: InsightDatasetKind;
        if (req.params.kind === "courses") {
            datasetType = InsightDatasetKind.Courses;
        } else if (req.params.kind === "rooms") {
            datasetType = InsightDatasetKind.Rooms;
        } else {
            datasetType = null;
        }
        return this.insightFacade.addDataset(datasetId, content, datasetType).then((arr: string[]) => {
            res.send(200, {
                result: arr
            });
        }).catch((err: any) => {
            res.json(400, {
                error: `Failed to add dataset with id = ${req.params.id} because ${err}.`
            });
        });
    }

    private delHandler(req: restify.Request, res: restify.Response, next: restify.Next) {
        return this.insightFacade.removeDataset(req.params.id).then((arr: string) => {
            res.send(200, {
                result: arr
            });
        }).catch((err: any) => {
            if (err instanceof NotFoundError) {
                res.json(404, {
                    error: `Failed to remove dataset with id = ${req.params.id} because ${err}.`
                });
            } else {
                res.json(400, {
                    error: `Failed to remove dataset with id = ${req.params.id} because ${err}.`
                });
            }
        });
    }

    private postHandler(req: restify.Request, res: restify.Response, next: restify.Next) {
        return this.insightFacade.performQuery(req.body).then((arr: any[]) => {
            res.send(200, {
                result: arr
            });
        }).catch((err: any) => {
            res.json(400, {
                error: `Failed in performQuery() because ${err}.`
            });
        });
    }

    private getHandler(req: restify.Request, res: restify.Response, next: restify.Next) {
        return this.insightFacade.listDatasets().then((arr: InsightDataset[]) => {
            res.send(200, {
                result: arr
            });
        });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

}
