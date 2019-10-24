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
    private buildingFiles: string[] = [];
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
        // Log.test("STOP");
    }

    public writeToFile(): boolean {
        fs.writeFileSync(__dirname + "/../../data/" + this.id + ".txt", JSON.stringify(this));
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
        // for (let k in node) {
        //     let key: string = k;
        //     if (key === "nodeName") {
        //         let tmp = node[key];
        //         if (node[key] === tagName) {
        //             return node;
        //         }
        //     } else if (key === "childNodes") {
        //         for (let element of node[key]) {
        //             let cNode = node[key];
        //             let obj = node[key].element;
        //             Log.test(obj);
        //             return this.findHTMLTagRecursive(element, tagName);
        //         }
        //     }
        // }
        if (node.nodeName === tagName) {
            switch (tagName) {
                case "table":
                    // TODO: Check if table class="views-table cols-5 table"
                    this.tableElement = node;
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
                this.extractBuildingPath(obj);
                count++;
            }
        }
        Log.test(count + "");
    }

    private extractBuildingPath(obj: any) {
        for (let tag of obj.childNodes) {
            if (tag.nodeName === "td") {
                if (tag.attrs[0].value === "views-field views-field-nothing") {
                    this.extractHREF(tag);
                    break;
                }
            }
        }
    }

    private extractHREF(tag: any) {
        for (let obj of tag.childNodes) {
            if (obj.nodeName === "a") {
                let path: string = obj.attrs[0].value;
                path = path.replace(".", "rooms");
                // TODO: Parse building data here
                this.buildingFiles.push(path);
                break;
            }
        }
    }

    private parseBuildingFiles(): Promise<any> {
        const promises: Array<Promise<any>> = [];
        let datasetRef = new Dataset(this.id, this.kind);
        datasetRef = this;
        for (let path of this.buildingFiles) {
            return this.zipFile.file(path).async("text").then(function (building: string) {
                // extract the relevant room information for each building
                // TODO: surround in try/catch if no table was found in room file
                 datasetRef.extractRoomsFromBuilding(building);
            }).catch((err: any) => {
                // HTML file didnt contain a table with room data, but that's okay
                Log.error("Building didn't have any rooms table");
            });
        }
        return Promise.all(promises).then(function () {
            // write to disk
            return Promise.resolve();
        }).catch((err: any) => {
            return Promise.reject(new InsightError("Promise.all returned one or more Promise.reject"));
        });
    }

    private extractRoomsFromBuilding(building: string): Promise<any> {
        const parse5 = require("parse5");
        const document = parse5.parse(building);
        this.findTableElement(document);
        let tbody: any;
        for (let obj of this.tableElement.childNodes) {
            if (obj.nodeName === "tbody") {
                tbody = obj;
                break;
            }
        }
        return this.extractRoomInfo(tbody);
    }

    private extractRoomInfo(tbody: any): Promise<any> {
        for (let row of tbody.childNodes) {
            if (row.nodeName === "tr") {
                return this.addRoomToDataset(row);
            }
        }
    }

    private addRoomToDataset(row: any): Promise<any> {
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
                }
            }
        }
        // TODO: after keys validated, push to array and find geolocation
        this.allSections.push(newRoom);
        this.numRows++;
        return Promise.resolve();
    }
}
