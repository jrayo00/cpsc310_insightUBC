import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import InsightQuery from "../controller/InsightQuery";
import Log from "../Util";

export default class Scheduler implements IScheduler {

    private queryHelpers: InsightQuery;
    private processedRooms: any[];
    private timeSlot: TimeSlot[];

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        this.queryHelpers = new InsightQuery();
        this.timeSlot = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100", "MWF 1100-1200",
            "MWF 1200-1300", "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700", "TR  0800-0930",
            "TR  0930-1100", "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];
        // Preprocess rooms, return rooms grouped by rooms_dist (I made up) and ordered by rooms_seats
        this.processedRooms = this.processRooms(rooms);
        // Preprocess sections
        let processedSections = this.processSections(sections);
        // Make schedule with processed items
        let schedule = this.makeSched(processedSections);
        return schedule;
    }

    private makeSched(groupedSections: any[][]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let schedule: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        // Find a good room for each section
        for (let sections of groupedSections) {
            // Find a good room for the whole course
            Log.info(`In makeSched Schedule with sections length: ${sections.length}`);
            let section = 0;
            while (section < sections.length) {
                Log.info(`In while loop of makeSched with sections length: ${sections.length}`);
                let combos: Array<[SchedRoom, SchedSection, TimeSlot]> = this.findRoom(sections, section);
                section += combos.length;
                schedule = schedule.concat(combos);
                // Break the loop if no room is founded
                // if (combos.length === 0) {
                //     break;
                // }
            }
        }
        return schedule;
    }

    private findRoom(sections: any, section: number):
        Array<[SchedRoom, SchedSection, TimeSlot]> {
        let secTimes = new Array(15).fill(0);
        let sec = sections[section];
        let room: SchedRoom;
        let roomTracker: number[];
        let combos: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        for (let i in this.processedRooms) {
            Log.info(`In for loop of findRoom with room: ${i}`);
            if (section >= sections.length) {
                return combos;
            }
            let roomObj = this.processedRooms[i];
            room = roomObj["room"];
            roomTracker = roomObj["roomTracker"];
            // Find time
            let validTimes = this.findTime(secTimes, roomTracker);
            while (section < sections.length && room["rooms_seats"] >= sec["size"] && validTimes.length > 0) {
                // Log.info(`In while loop of findRoom with section: ${section}`);
                let timeSched = validTimes[0];
                let combo: [SchedRoom, SchedSection, TimeSlot] = [room, sec["section"], this.timeSlot[timeSched]];
                // Keep track of the number of times a room gets scheduled
                roomTracker[timeSched] += 1;
                secTimes[timeSched] += 1;
                // Save result
                combos.push(combo);
                section ++;
                // Update
                if (section < sections.length) {
                    sec = sections[section];
                    validTimes = this.findTime(secTimes, roomTracker);
                }
            }
        }
        return combos;
    }

    private findTime(a: number[], b: number[]): number[] {
        let secTimes = this.findAllTimes(a);
        let roomTimes = this.findAllTimes(b);
        return this.queryHelpers.insightFetchHelper.intersectIndexes(secTimes, roomTimes);
    }

    private findAllTimes(a: number[]): number[] {
        let matches: number[] = [];
        for (let i = 0; i < a.length; i++) {
            if (a[i] === 0) {
                matches.push(i);
            }
        }
        return matches;
    }

    private processSections(sections: SchedSection[]): any[][] {
        // Compute the class size and add to a new section object
        let processSections = this.addSectionSize(sections);
        // Group by courses_dept and courses_id
        processSections = this.queryHelpers.insightTransformHelper.groupBy(processSections, (info: any) => {
            let result: any[] = [];
            for (let col of ["courses_dept", "courses_id"]) {
                let item = info["section"];
                result = result.concat(item[col]);
            }
            // Return the value of the sorting properties
            return result;
        });
        return processSections;
    }

    private processRooms(rooms: SchedRoom[]): any[] {
        const centre = rooms[0];
        let processedRooms: SchedRoom[] = this.sortByProperties(rooms, ["rooms_seats"]);
        let newRooms: any[] = [];
        for (let room of processedRooms) {
            // let clone = JSON.parse(JSON.stringify(room));
            let copy: {[key: string]: number[] | SchedRoom | number, } = {};
            let dist = this.getDistance(centre.rooms_lat, centre.rooms_lon, room.rooms_lat, room.rooms_lon);
            copy["room"] = room;
            copy["roomTracker"] = new Array(15).fill(0);
            copy["dist"] = dist;
            newRooms.push(copy);
        }
        newRooms = this.sortByProperties(newRooms, ["dist"]);
        return newRooms;
    }

    // private addProperty(array: any[], newProperty: string, val: any): any[] {
    //     array.forEach((e) => {
    //         // Adapt to the data structure
    //         e[newProperty] = val;
    //     });
    //     let result = JSON.stringify(array);
    //     return JSON.parse(result);
    // }

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

    // Should return an array of arrays of objects (e.g., courses or rooms)
    // private getGroupedItems(items: any[], groupedCols: any[]): any[] {
    //     return this.queryHelpers.insightTransformHelper.groupBy(items, (info: any) => {
    //         let result: any[] = [];
    //         for (let col of groupedCols) {
    //             result = result.concat(info[col]);
    //         }
    //         // Return the value of the sorting properties
    //         return result;
    //     });
    // }

    private getDistance(lat0: number, lon0: number, lat1: number, lon1: number): number {
        const latDiff = lat0 - lat1;
        const lonDiff = lon0 - lon1;
        return Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lonDiff, 2));
    }
}
