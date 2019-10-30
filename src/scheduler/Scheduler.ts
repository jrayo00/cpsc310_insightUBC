import {IScheduler, ISchedRoom, ISchedSection, TimeSlot} from "./IScheduler";

export default class Scheduler implements IScheduler {

    public schedule(sections: ISchedSection[], rooms: ISchedRoom[]): Array<[ISchedRoom, ISchedSection, TimeSlot]> {
        // TODO Implement this
        return [];
    }
}
