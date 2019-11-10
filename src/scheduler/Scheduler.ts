import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import InsightQuery from "../controller/InsightQuery";
import Log from "../Util";

export default class Scheduler implements IScheduler {

    private queryHelpers: InsightQuery;

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        this.queryHelpers = new InsightQuery();
        // Preprocess rooms, return rooms grouped by rooms_dist (I made up) and ordered by rooms_seats
        let processedRooms = this.processRooms(rooms);
        // Preprocess sections
        let processedSections = this.processSections(sections);
        // Make schedule with processed items
        let schedule = this.makeSched(processedSections, processedRooms);
        // Extract SchedSction and SchedRoom
        return this.extractProperties(schedule);
    }

    private extractProperties(schedule: any[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let results: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        let combo: [SchedRoom, SchedSection, TimeSlot];
        for (let i in schedule) {
            // First, clone section and cast it to interface
            let section: SchedSection = this.makeSchedSection(schedule[i][0]);
            // Then, clone room and cast to interface
            let room: SchedRoom = this.makeSchedRoom(schedule[i][1]);
            let timeslot: TimeSlot = schedule[i][2];
            combo = [room, section, timeslot];
            results.push(combo);
        }
        return results;
    }

    private makeSchedSection(section: any): SchedSection {
        let schedSection = {} as SchedSection;
        for (let key of Object.keys(section)) {
            if (key.includes("courses")) {
                switch (key) {
                    case "courses_dept":
                        schedSection.courses_dept = section[key];
                        break;
                    case "courses_id":
                        schedSection.courses_id = section[key];
                        break;
                    case "courses_uuid":
                        schedSection.courses_uuid = section[key];
                        break;
                    case "courses_pass":
                        schedSection.courses_pass = section[key];
                        break;
                    case "courses_fail":
                        schedSection.courses_fail = section[key];
                        break;
                    case "courses_audit":
                        schedSection.courses_audit = section[key];
                        break;
                    case "courses_avg":
                        schedSection.courses_avg = section[key];
                        break;
                    case "courses_instructor":
                        schedSection.courses_instructor = section[key];
                        break;
                    case "courses_title":
                        schedSection.courses_title = section[key];
                        break;
                    case "courses_year":
                        schedSection.courses_year = section[key];
                        break;
                }
            }
        }
        return schedSection;
    }

    private makeSchedRoom(room: any): SchedRoom {
        let schedRoom = {} as SchedRoom;
        for (let key of Object.keys(room)) {
            if (key.includes("rooms")) {
                switch (key) {
                    case "rooms_shortname":
                        schedRoom.rooms_shortname = room[key];
                        break;
                    case "rooms_number":
                        schedRoom.rooms_number = room[key];
                        break;
                    case "rooms_seats":
                        schedRoom.rooms_seats = room[key];
                        break;
                    case "rooms_lat":
                        schedRoom.rooms_lat = room[key];
                        break;
                    case "rooms_lon":
                        schedRoom.rooms_lon = room[key];
                        break;
                    case "rooms_name":
                        schedRoom.rooms_name = room[key];
                        break;
                    case "rooms_fullname":
                        schedRoom.rooms_fullname = room[key];
                        break;
                    case "rooms_address":
                        schedRoom.rooms_address = room[key];
                        break;
                    case "rooms_type":
                        schedRoom.rooms_type = room[key];
                        break;
                    case "rooms_furniture":
                        schedRoom.rooms_furniture = room[key];
                        break;
                    case "rooms_href":
                        schedRoom.rooms_href = room[key];
                        break;
                }
            }
        }
        return schedRoom;
    }

    private makeSched(groupedSections: any[][], groupedRooms: any[][]): any[][] {
        let schedule: any[][] = [[]];
        // Keep track of the number of times a room gets scheduled
        let roomCount: any[][] = JSON.parse(JSON.stringify(groupedRooms));
        for (let a of roomCount) {
            a = a.fill(0);
        }
        // Find a good room for each section
        for (let sections of groupedSections) {
            // Find a good room for the whole course
            let section = 0;
            while (section < sections.length) {
                let combos = this.findRoom(sections, section, groupedRooms, roomCount);
                section += combos.length;
                schedule = schedule.concat(combos);
            }
        }
        // Remove the first empty element
        schedule.shift();
        return schedule;
    }

    private findRoom(sections: any, section: number, groupedRooms: any[][], roomCount: any[][]): any[][] {
        const size = sections[0]["overall_size"];
        const timeSlot = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100", "MWF 1100-1200", "MWF 1200-1300",
            "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700", "TR  0800-0930", "TR  0930-1100",
            "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];
        let room;
        let combos = [];
        for (let i in groupedRooms) {
            if (section > sections.length) {
                return combos;
            }
            for (let j in groupedRooms[i]) {
                if (section > sections.length) {
                    return combos;
                }
                room = groupedRooms[i][j];
                if (room["rooms_seats"] >= size && roomCount[i][j] < 15) {
                    while (section < sections.length) {
                        let timeSched = roomCount[i][j];
                        let combo = [sections[section], room, timeSlot[timeSched]];
                        roomCount[i][j] += 1;
                        combos.push(combo);
                        section ++;
                    }
                }
            }
        }
        return combos;
    }

    private processSections(sections: SchedSection[]): any[][] {
        // Compute the class size and add to a new section object
        let processSections = this.addSectionSize(sections);
        // Group by courses_dept and courses_id
        processSections = this.getGroupedItems(processSections, ["courses_dept", "courses_id"]);
        // Get maximum size within a group
        processSections = this.applyMAX(processSections, "overall_size", "size");
        return processSections;
    }

    private processRooms(rooms: SchedRoom[]): any[][] {
        // Compute the distance
        let processedRooms = this.addDistance(rooms);
        // Group by distance
        processedRooms = this.getGroupedItems(processedRooms, ["dist"]);
        // Order each group by rooms_size
        for (let i in processedRooms) {
            processedRooms[i] = this.sortByProperties(processedRooms[i], ["rooms_seats"]);
        }
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
            let clone = JSON.parse(JSON.stringify(section));
            let size = section.courses_audit + section.courses_fail + section.courses_pass;
            clone["size"] = size;
            newSections.push(clone);
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
            // Clone the ScheRoom obj and add the dist
            let clone = JSON.parse(JSON.stringify(room));
            let dist = this.getDistance(centre.rooms_lat, centre.rooms_lon, room.rooms_lat, room.rooms_lon);
            clone["dist"] = dist;
            newRooms.push(clone);
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
