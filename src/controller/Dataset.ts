import Log from "../Util";
import {Section} from "./Section";
import {Room} from "./Room";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs";

export class Dataset {
    public allSections: any[] = [];
    public id: string;
    public numRows: number = 0;
    public kind: InsightDatasetKind;
    private bodyElement  = {};
    private htmlElement = {};
    private tableElement = {};
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

    public parseRoomsDataset(data: string) {
        const parse5 = require("parse5");
        const document = parse5.parse(data);
        this.findTableElement(document);
        // Log.test(JSON.stringify(this.tableElement));
        this.parseTableElement(this.tableElement);
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
                this.extractRoomInfo(obj);
                count++;
            }
        }
        Log.test(count + "");
    }

    private extractRoomInfo(obj: ChildNode) {
        let newRoom: Room = new Room();

    }
}
