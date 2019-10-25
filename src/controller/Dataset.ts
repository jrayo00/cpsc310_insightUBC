import Log from "../Util";
import {Section} from "./Section";
import {Room} from "./Room";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs";
import * as JSZip from "jszip";

export class Dataset {
    public allSections: any[] = [];
    public id: string;
    public numRows: number = 0;
    public kind: InsightDatasetKind;
    private tableElement: any;
    private zipFile: JSZip;
    private buildingFiles: any[] = [];
    private geoPromises: Array<Promise<any>> = [];
    constructor(id: string, datasetType: InsightDatasetKind) {
        Log.trace("Dataset::init()");
        this.id = id;
        this.kind = datasetType;
    }

    public parseDataCourses(data: string) {
        try {
            let obj = JSON.parse(data);
            // Log.test(obj.result.length);
            for (let item of obj.result) {
                // iterate through result array and get the key value pairs
                let newSection: Section = new Section();
                newSection.info.dept = item.Subject;
                newSection.info.id = item.Course;
                newSection.info.avg = item.Avg;
                newSection.info.instructor = item.Professor;
                newSection.info.title = item.Title;
                newSection.info.pass = item.Pass;
                newSection.info.fail = item.Fail;
                newSection.info.audit = item.Audit;
                newSection.info.uuid = item.id.toString();
                newSection.info.year = Number(item.Year);
                if (item.Section === "overall") {
                    newSection.info.year = 1900;
                }
                if (newSection.validateKeys()) {
                    this.allSections.push(newSection);
                    this.numRows++;
                }
            }
        } catch (err) {
            throw new SyntaxError("invalid JSON");
        }
    }

    public writeToFile(): boolean {
        let obj = {
            allSections: this.allSections,
            id: this.id,
            numRows: this.numRows,
            kind: this.kind
        };
        fs.writeFileSync(__dirname + "/../../data/" + this.id + ".txt", JSON.stringify(obj));
        Log.test("The file has been saved!");
        return true;
    }

    public parseRoomsDataset(data: string, zip: JSZip): Promise<any> {
        this.zipFile = zip;
        const parse5 = require("parse5");
        const document = parse5.parse(data);
        this.findTableElement(document);
        // Log.test(JSON.stringify(this.tableElement));
        this.parseTableElement(this.tableElement);
        return this.parseBuildingFiles();
    }

    private findTableElement(document: any) {
        this.findTableElementRecursive(document, "table");
    }

    private findTableElementRecursive(node: any, tagName: string) {
        if (node.nodeName === tagName) {
            switch (tagName) {
                case "table":
                    if (node.attrs[0].value === "views-table cols-5 table") {
                        this.tableElement = node;
                    }
                    break;
            }
            return;
        }
        if (node.childNodes !== undefined) {
            for (let obj of node.childNodes) {
                this.findTableElementRecursive(obj, tagName);
            }
        }
    }

    private parseTableElement(node: any) {
        let tbody: any;
        let count: number = 0;
        for (let obj of node.childNodes) {
            if (obj.nodeName === "tbody") {
                tbody = obj;
                break;
            }
        }
        for (let obj of tbody.childNodes) {
            if (obj.nodeName === "tr") {
                this.extractBuildingAttributes(obj);
                count++;
            }
        }
        Log.test(count + "");
    }

    private extractBuildingAttributes(obj: any) {
        let buildingInfo = {
            path : "",
            shortname : "",
            fullname : "",
            address : "",
            lat: -1,
            lon: -1
        };
        for (let tag of obj.childNodes) {
            if (tag.nodeName === "td") {
                switch (tag.attrs[0].value) {
                    case "views-field views-field-nothing":
                        buildingInfo.path = this.extractFilePath(tag);
                        break;
                    case "views-field views-field-field-building-code":
                        buildingInfo.shortname = tag.childNodes[0].value.trim();
                        break;
                    case "views-field views-field-title":
                        buildingInfo.fullname = this.extractBuildingFullName(tag);
                        break;
                    case "views-field views-field-field-building-address":
                        buildingInfo.address = tag.childNodes[0].value.trim();
                        break;
                }
            }
        }
        try {
            this.findGeoLocation(buildingInfo);
        } catch (err) {
            Log.error("geolocation API is down");
        }
    }

    private extractBuildingFullName(tag: any) {
        for (let obj of tag.childNodes) {
            if (obj.nodeName === "a") {
                let fullName: string = obj.childNodes[0].value.trim();
                return fullName;
            }
        }
    }

    private extractFilePath(tag: any): string {
        for (let obj of tag.childNodes) {
            if (obj.nodeName === "a") {
                let path: string = obj.attrs[0].value;
                path = path.replace(".", "rooms");
                return path;
            }
        }
    }

    private parseBuildingFiles(): Promise<any> {
        const promises: Array<Promise<any>> = [];
        let datasetRef = new Dataset(this.id, this.kind);
        datasetRef = this;
        return Promise.all(this.geoPromises).then(function () {
            for (let obj of this.buildingFiles) {
                promises.push(this.zipFile.file(obj.path).async("text").then(function (buildingHTML: string) {
                    // extract the relevant room information for each building
                     datasetRef.extractRoomsFromBuilding(buildingHTML, obj);
                }).catch((err: any) => {
                    // HTML file didnt contain a table with room data, but that's okay
                    Log.error("Building didn't have any rooms table");
                }));
            }
            return Promise.all(promises).then(function () {
                // write to disk
                let tmp = datasetRef;
                Log.test("All rooms have been parsed. Writing...");
                return Promise.resolve();
            });
        }).catch((err: any) => {
            return Promise.reject(new InsightError("Promise.all returned one or more Promise.reject"));
        });
    }

    private extractRoomsFromBuilding(building: string, buildAttributes: any) {
        const parse5 = require("parse5");
        const document = parse5.parse(building);
        this.tableElement = null;
        this.findTableElement(document);
        let tbody: any;
        for (let obj of this.tableElement.childNodes) {
            if (obj.nodeName === "tbody") {
                tbody = obj;
                break;
            }
        }
        this.extractRoomInfo(tbody, buildAttributes);
    }

    private extractRoomInfo(tbody: any, buildAttributes: any) {
        for (let row of tbody.childNodes) {
            if (row.nodeName === "tr") {
                this.addRoomToDataset(row, buildAttributes);
            }
        }
    }

    private addRoomToDataset(row: any, buildAttributes: any) {
        let newRoom: Room = new Room();
        for (let col of row.childNodes) {
            if (col.nodeName === "td") {
                switch (col.attrs[0].value) {
                    case "views-field views-field-field-room-capacity":
                        newRoom.info.seats = col.childNodes[0].value.trim();
                        break;
                    case "views-field views-field-field-room-furniture":
                        newRoom.info.furniture = col.childNodes[0].value.trim();
                        break;
                    case "views-field views-field-field-room-type":
                        newRoom.info.type = col.childNodes[0].value.trim();
                        break;
                    case "views-field views-field-field-room-number":
                        newRoom.info.href = col.childNodes[1].attrs[0].value.trim();
                        newRoom.info.number = col.childNodes[1].childNodes[0].value.trim();
                        break;
                }
            }
        }
        newRoom.info.shortname = buildAttributes.shortname;
        newRoom.info.fullname = buildAttributes.fullname;
        newRoom.info.address = buildAttributes.address;
        newRoom.info.lat = buildAttributes.lat;
        newRoom.info.lon = buildAttributes.lon;
        newRoom.info.name = newRoom.info.shortname + "_" + newRoom.info.number;
        this.allSections.push(newRoom);
        this.numRows++;
    }

    private findGeoLocation(building: any) {
        let addr = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team253/";
        const http = require("http");
        // Code based off of https://www.twilio.com/blog/2017/08/http-requests-in-node-js.html
        const myNewPromise = new Promise((resolve, reject) => {
            let buildingRef = building;
            let buildingFilesRef: any[] = this.buildingFiles;
            http.get(addr + encodeURIComponent(building.address),
                (resp: any) => {
                    let data = "";
                    Log.test("API CALLBACK");
                    let buildingRef2 = buildingRef;
                    let buildingFilesRef2: any[] = buildingFilesRef;
                    // A chunk of data has been received.
                    resp.on("data", (chunk: any) => {
                        data += chunk;
                        let obj = JSON.parse(data);
                        if (Object.keys(data).length > 1) {
                            buildingRef2.lat = obj.lat;
                            buildingRef2.lon = obj.lon;
                            buildingFilesRef2.push(buildingRef2);
                        }
                        resolve();
                    });

                    // The whole response has been received. Print out the result.
                    resp.on("end", () => {
                        Log.test("closing http connection");
                    });

                }).on("error", (err: any) => {
                Log.error("Error: " + err.message);
            });
        }).catch((err: any) => {
            Log.error("Fetch request failed");
        });
        this.geoPromises.push(myNewPromise);
    }
}
