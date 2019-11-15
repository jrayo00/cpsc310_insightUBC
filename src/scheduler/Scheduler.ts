import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import InsightQuery from "../controller/InsightQuery";
import Log from "../Util";

export default class Scheduler implements IScheduler {

    private queryHelpers: InsightQuery;
    private centre: SchedRoom;
    private notSchedSections: SchedSection[];
    private processedRooms: any[];
    private timeSlot: TimeSlot[];
    private maxDist1: number;
    private totalEnrol1: number;
    private score1: number;
    private maxDist2: number;
    private totalEnrol2: number;
    private score2: number;

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        const schedule1: Array<[SchedRoom, SchedSection, TimeSlot]> = this.schedule1(sections, rooms);
        // const schedule2: Array<[SchedRoom, SchedSection, TimeSlot]> = this.schedule2(sections, rooms);
        // if (this.score2 > this.score1) {
        //     return schedule2;
        // }
        return schedule1;
    }
    //
    // private schedule2(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
    //     this.processedRooms = this.processRooms(rooms);
    //     let processedSections = this.addSectionSize(sections);
    //     processedSections = this.sortByProperties(processedSections, ["size"]).reverse();
    //     // Make schedule with processed items
    //     let schedule = this.makeSched2(processedSections);
    //     this.score2 = (1 - this.maxDist2) * 0.3 + this.totalEnrol2 * 0.7;
    //     Log.info("score is: " + this.score2.toString());
    //     return schedule;
    // }
    //
    // private makeSched2(sections: any[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
    //     let schedule: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
    //     for (const section of sections) {
    //         const possibleRooms = this.getAllPossibleRooms(section);
    //         const pairedRoom = this.findBestRoom(possibleRooms, schedule);
    //     }
    //
    //     return schedule;
    // }
    //
    // private findBestRoom(possibleRooms: any, schedule: any) {
    //     // asdas
    // }
    //
    // private getAllPossibleRooms(section: any) {
    //     const copy = [];
    //     for (const room of this.processedRooms) {
    //         let size = section.courses_audit + section.courses_fail + section.courses_pass;
    //         if (room.rooms_seats >= size) {
    //             copy.push(room);
    //         }
    //     }
    //     return copy;
    // }

    private schedule1(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        this.maxDist1 = 0;
        this.totalEnrol1 = 0;
        this.queryHelpers = new InsightQuery();
        this.timeSlot = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100", "MWF 1100-1200",
            "MWF 1200-1300", "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700", "TR  0800-0930",
            "TR  0930-1100", "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];
        // Set room centre
        this.notSchedSections = [];
        this.centre = rooms[0];
        // Preprocess sections
        let processedSections = this.processSections(sections);
        // Preprocess rooms, return rooms grouped by dist and ordered by rooms_seats
        this.processedRooms = this.processRooms(rooms);
        // Make schedule with processed items
        let schedule: Array<[SchedRoom, SchedSection, TimeSlot]> = this.makeSched1(processedSections);
        this.score1 = (1 - this.maxDist1) * 0.3 + this.totalEnrol1 * 0.7;
        Log.info("score is: " + this.score1.toString());
        // Set room centre
        this.totalEnrol1 = 0;
        this.centre = schedule[0][0];
        // Preprocess sections
        processedSections = this.processSections(sections);
        // Preprocess rooms, return rooms grouped by dist and ordered by rooms_seats
        this.processedRooms = this.processRooms(rooms);
        // Make schedule with processed items
        schedule = this.makeSched1(processedSections);
        this.score1 = (1 - this.maxDist1) * 0.3 + this.totalEnrol1 * 0.7;
        Log.info("score is: " + this.score1.toString());
        return schedule;
    }

    private makeSched1(groupedSections: any[][]): Array<[SchedRoom, SchedSection, TimeSlot]> {
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
                // Skip that section if no room is founded
                if (combos.length === 0) {
                    let sec = sections[section];
                    this.notSchedSections.push(sec["section"]);
                    section ++;
                }
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
            let roomDist = roomObj["dist"];
            // Find time
            let validTimes = this.findTime(secTimes, roomTracker);
            while (section < sections.length && room["rooms_seats"] >= sec["size"] && validTimes.length > 0) {
                // Log.info(`In while loop of findRoom with section: ${section}`);
                let timeSched = validTimes[0];
                let combo: [SchedRoom, SchedSection, TimeSlot] = [room, sec["section"], this.timeSlot[timeSched]];
                // Keep track of the number of times a room gets scheduled
                roomTracker[timeSched] += 1;
                secTimes[timeSched] += 1;
                // Update the maxDist1
                if (roomDist > this.maxDist1) {
                    this.maxDist1 = roomDist;
                }
                this.totalEnrol1 += sec["size"];
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
        processSections = this.sortByProperties(processSections, ["size"]);
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
        let processedRooms: SchedRoom[] = this.sortByProperties(rooms, ["rooms_seats"]);
        let newRooms: any[] = [];
        for (let room of processedRooms) {
            // let clone = JSON.parse(JSON.stringify(room));
            let copy: {[key: string]: number[] | SchedRoom | number, } = {};
            let dist = this.getDistance(this.centre.rooms_lat, this.centre.rooms_lon, room.rooms_lat, room.rooms_lon);
            copy["room"] = room;
            copy["roomTracker"] = new Array(15).fill(0);
            copy["dist"] = dist;
            newRooms.push(copy);
        }
        newRooms = this.sortByProperties(newRooms, ["dist"]);
        return newRooms;
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

    // Adapted from stack overflow
    // https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-
    // haversine-formula
    private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radius of the earth in km
        let dLat = this.deg2rad(lat2 - lat1);  // deg2rad below
        let dLon = this.deg2rad(lon2 - lon1);
        let a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        // Distance in meter
        let d = R * c * 1000;
        // Return index
        return d / 1372;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

}
