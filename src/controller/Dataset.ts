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
    private bodyElement: any;
    private htmlElement: any;
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
        // TODO: find html element before finding body
        this.findHTMLTagRecursive(document, "html");
        this.findHTMLTagRecursive(this.htmlElement, "body");
        this.findHTMLTagRecursive(this.bodyElement, "table");
    }

    private findHTMLTagRecursive(node: any, tagName: string) {
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
                case "html":
                    this.htmlElement = node;
                    break;
                case "body":
                    this.bodyElement = node;
                    break;
                case "table":
                    this.tableElement = node;
                    break;
            }
            return;
        }
        if (node.childNodes !== undefined) {
            for (let obj of node.childNodes) {
                this.findHTMLTagRecursive(obj, tagName);
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
                this.buildingFiles.push(obj.attrs[0].value);
                break;
            }
        }
    }

    private parseBuildingFiles(): Promise<any> {
        const promises: Array<Promise<any>> = [];
        for (let path of this.buildingFiles) {
            promises.push(this.zipFile.file(path).async("text").then(function (building: string) {
                // extract the relevant room information for each building
                this.extractRoomsFromBuilding(building);
            }));
        }
        return Promise.all(promises).then(function () {
            return Promise.resolve();
        }).catch((err: any) => {
            return Promise.reject(new InsightError("Promise.all returned one or more Promise.reject"));
        });
    }

    private extractRoomsFromBuilding(building: string) {
        this.findTableElement(building);
        let tbody: any;
        for (let obj of this.tableElement) {
            if (obj.nodeName === "tbody") {
                tbody = obj;
                break;
            }
        }
        this.extractRoomInfo(tbody);
    }

    private extractRoomInfo(tbody: any) {
        // TODO: Check if hardcoding is applicable here
        // inside of "more info"
        // let newRoom: Room = new Room();
        // newRoom.info.shortname = obj.childNodes[3].childNodes[0].value.trimStart();
        // newRoom.info.fullname = obj.childNodes[5].childNodes[1].childNodes[0].value.trimStart();
        for (let row of tbody.childNodes) {
            if (row.nodeName === "tr") {
                this.addRoomToDataset(row);
            }
        }
    }

    private addRoomToDataset(row: any) {
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
    }
}
