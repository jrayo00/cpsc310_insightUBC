import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import InsightQuery from "../controller/InsightQuery";
import Log from "../Util";

export default class Scheduler implements IScheduler {

    private queryHelpers: InsightQuery;
    private roomCount: any[];

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        this.queryHelpers = new InsightQuery();
        // Preprocess rooms, return rooms grouped by rooms_dist (I made up) and ordered by rooms_seats
        let processedRooms: SchedRoom[] = this.processRooms(rooms);
        // Preprocess sections
        let processedSections = this.processSections(sections);
        // Make schedule with processed items
        let schedule = this.makeSched(processedSections, processedRooms);
        return schedule;
    }

    private makeSched(groupedSections: any[][], groupedRooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let schedule: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        // Keep track of the number of times a room gets scheduled
        this.roomCount = JSON.parse(JSON.stringify(groupedRooms));
        this.roomCount = this.roomCount.fill(0);
        // Find a good room for each section
        for (let sections of groupedSections) {
            // Find a good room for the whole course
            let section = 0;
            while (section < sections.length) {
                let combos: Array<[SchedRoom, SchedSection, TimeSlot]> =
                    this.findRoom(sections, section, groupedRooms);
                section += combos.length;
                schedule = schedule.concat(combos);
            }
        }
        return schedule;
    }

    private findRoom(sections: any, section: number, groupedRooms: SchedRoom[]):
        Array<[SchedRoom, SchedSection, TimeSlot]> {
        const size = sections[0]["overall_size"];
        const timeSlot: TimeSlot[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100", "MWF 1100-1200",
            "MWF 1200-1300", "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700", "TR  0800-0930",
            "TR  0930-1100", "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];
        let room: SchedRoom;
        let combos: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        for (let i in groupedRooms) {
            if (section >= sections.length) {
                return combos;
            }
            room = groupedRooms[i];
            if (room["rooms_seats"] >= size && this.roomCount[i] < 15) {
                while (section < sections.length) {
                    let timeSched = this.roomCount[i];
                    let sec = sections[section];
                    let combo: [SchedRoom, SchedSection, TimeSlot] = [room, sec["section"], timeSlot[timeSched]];
                    this.roomCount[i] += 1;
                    combos.push(combo);
                    section ++;
                }
            }
        }
        return combos;
    }

    private processSections(sections: SchedSection[]): any[][] {
        // Compute the class size and add to a new section object
        let processSections = this.addSectionSize(sections);
        // Group by courses_dept and courses_id
        // processSections = this.getGroupedItems(processSections, ["courses_dept", "courses_id"]);
        processSections = this.queryHelpers.insightTransformHelper.groupBy(processSections, (info: any) => {
            let result: any[] = [];
            for (let col of ["courses_dept", "courses_id"]) {
                let item = info["section"];
                result = result.concat(item[col]);
            }
            // Return the value of the sorting properties
            return result;
        });
        // Get maximum size within a group
        processSections = this.applyMAX(processSections, "overall_size", "size");
        return processSections;
    }

    private processRooms(rooms: SchedRoom[]): SchedRoom[] {
        // Compute the distance
        // let processedRooms = this.addDistance(rooms);
        // Group by distance
        // processedRooms = this.getGroupedItems(processedRooms, ["dist"]);
        // Order each group by rooms_size
        // for (let i in processedRooms) {
        //     processedRooms[i] = this.sortByProperties(processedRooms[i], ["rooms_seats"]);
        // }
        let processedRooms: SchedRoom[] = this.sortByProperties(rooms, ["rooms_seats"]);
        return processedRooms;
    }

    private applyMAX(groupedItems: any[][], newKey: string, col: string): any[][] {
        // For each group in groupedResult
        for (let i in groupedItems) {
            let group = groupedItems[i];
            let max = Math.max.apply(Math, group.map((o) => {
                return Number(o[col]);
            }));
            // Add the local max as a new property
            groupedItems[i] = this.addProperty(groupedItems[i], newKey, max);
        }
        return groupedItems;
    }

    private addProperty(array: any[], newProperty: string, val: any): any[] {
        array.forEach((e) => {
            // Adapt to the data structure
            e[newProperty] = val;
        });
        let result = JSON.stringify(array);
        return JSON.parse(result);
    }

    // Should return an array of arrays of objects (e.g., courses or rooms)
    private addSectionSize(sections: SchedSection[]): any[] {
        let newSections: any[] = [];
        for (let section of sections) {
            // let clone = JSON.parse(JSON.stringify(section));
            let copy: {[key: string]: number | string | SchedSection, } = {};
            let size = section.courses_audit + section.courses_fail + section.courses_pass;
            copy["section"] = section;
            copy["size"] = size;
            newSections.push(copy);
        }
        return newSections;
    }

    // Should return an array of arrays of objects (e.g., courses or rooms)
    private getGroupedItems(items: any[], groupedCols: any[]): any[] {
        return this.queryHelpers.insightTransformHelper.groupBy(items, (info: any) => {
            let result: any[] = [];
            for (let col of groupedCols) {
                result = result.concat(info[col]);
            }
            // Return the value of the sorting properties
            return result;
        });
    }

    private addDistance(rooms: SchedRoom[]): any[] {
        const centre = rooms[0];
        // Rooms with added distance between itself and the centre
        let newRooms: any[] = [];
        for (let room of rooms) {
            // let clone = JSON.parse(JSON.stringify(room));
            let copy: {[key: string]: number | string | SchedRoom, } = {};
            let dist = this.getDistance(centre.rooms_lat, centre.rooms_lon, room.rooms_lat, room.rooms_lon);
            copy["room"] = room;
            copy["dist"] = dist;
            newRooms.push(copy);
        }
        return newRooms;
    }

    private getDistance(lat0: number, lon0: number, lat1: number, lon1: number): number {
        const latDiff = lat0 - lat1;
        const lonDiff = lon0 - lon1;
        return Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lonDiff, 2));
    }

    private sortByProperties(items: any[], properties: string[]): any[] {
        // Sort by a list of properties
        items.sort((a, b) => {
            let flag = 0;
            for (let p in properties) {
                flag = flag || this.queryHelpers.insightValidateHelper.compareTo(a, b, properties[p]);
            }
            return flag;
        });
        return items;
    }
}
